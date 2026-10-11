/**
 * How well a profile fits someone's partner preferences, explained criterion by
 * criterion so the score is never a black box. Safe to import on the client.
 */
import { ageFrom } from "./bio";
import type { Biodata, PartnerPrefs } from "./types";

export type Reason = { label: string; ok: boolean | null; detail: string };
export type Match = { score: number; reasons: Reason[]; usedDefaults: boolean };

/** "5 ft 9 in (175 cm)" → 69 */
export function heightInches(h?: string) {
  const m = h?.match(/(\d+)\s*ft\s*(\d+)\s*in/);
  return m ? Number(m[1]) * 12 + Number(m[2]) : null;
}

export const inchesLabel = (n: number) => `${Math.floor(n / 12)}′${n % 12}″`;

const lc = (s?: string) => (s ?? "").trim().toLowerCase();

/** Preferences to use when a member hasn't set any: a customary age gap and their own religion. */
export function defaultPrefs(me: Biodata): PartnerPrefs {
  const age = ageFrom(me.dob);
  const prefs: PartnerPrefs = {};
  if (age !== null) {
    if (me.gender === "male") Object.assign(prefs, { ageMin: Math.max(18, age - 7), ageMax: age + 1 });
    else Object.assign(prefs, { ageMin: Math.max(21, age - 1), ageMax: age + 7 });
  }
  if (me.religion) prefs.religions = [me.religion];
  return prefs;
}

export function hasPrefs(p?: PartnerPrefs) {
  if (!p) return false;
  return Boolean(
    p.ageMin || p.ageMax || p.heightMin || p.heightMax || p.religions?.length || p.motherTongues?.length || p.marital?.length ||
      p.diets?.length || p.states?.length || p.communities?.trim() || p.manglik,
  );
}

function oneOf(list: string[] | undefined, value: string | undefined, label: string, weight: number): [Reason, number] | null {
  if (!list?.length) return null;
  if (!value) return [{ label, ok: null, detail: "Not mentioned" }, weight];
  const ok = list.some((x) => lc(x) === lc(value));
  return [{ label, ok, detail: value }, weight];
}

/** How well `them` fits what `me` is looking for. */
export function matchFor(me: Biodata, them: Biodata): Match {
  const usedDefaults = !hasPrefs(me.prefs);
  const p = usedDefaults ? defaultPrefs(me) : me.prefs!;
  const parts: [Reason, number][] = [];

  if (p.ageMin || p.ageMax) {
    const age = ageFrom(them.dob);
    const lo = p.ageMin ?? 18;
    const hi = p.ageMax ?? 99;
    parts.push([
      age === null
        ? { label: "Age", ok: null, detail: "Not mentioned" }
        : { label: "Age", ok: age >= lo && age <= hi, detail: `${age} yrs (you prefer ${lo}–${hi})` },
      3,
    ]);
  }
  if (p.heightMin || p.heightMax) {
    const h = heightInches(them.height);
    const lo = p.heightMin ?? 48;
    const hi = p.heightMax ?? 96;
    parts.push([
      h === null
        ? { label: "Height", ok: null, detail: "Not mentioned" }
        : { label: "Height", ok: h >= lo && h <= hi, detail: `${inchesLabel(h)} (you prefer ${inchesLabel(lo)}–${inchesLabel(hi)})` },
      1,
    ]);
  }
  for (const part of [
    oneOf(p.religions, them.religion, "Religion", 3),
    oneOf(p.marital, them.maritalStatus, "Marital status", 2),
    oneOf(p.motherTongues, them.motherTongue, "Mother tongue", 1),
    oneOf(p.diets, them.diet, "Diet", 1),
    oneOf(p.states, them.state, "Location", 1),
  ]) {
    if (part) parts.push(part);
  }
  const wanted = (p.communities ?? "").split(",").map(lc).filter(Boolean);
  if (wanted.length) {
    const theirs = [them.community, them.caste, them.subCaste].map(lc).filter(Boolean);
    parts.push([
      theirs.length
        ? { label: "Community", ok: wanted.some((w) => theirs.some((t) => t.includes(w) || w.includes(t))), detail: [them.community, them.caste].filter(Boolean).join(", ") }
        : { label: "Community", ok: null, detail: "Not mentioned" },
      2,
    ]);
  }
  if (p.manglik) {
    const m = them.manglik;
    const isYes = m === "Yes" || Boolean(m?.startsWith("Anshik"));
    parts.push([
      !m || m === "Don't know"
        ? { label: "Manglik", ok: null, detail: "Not mentioned" }
        : { label: "Manglik", ok: p.manglik === "Yes" ? isYes : !isYes, detail: m },
      1,
    ]);
  }

  if (!parts.length) return { score: 0, reasons: [], usedDefaults };
  const total = parts.reduce((n, [, w]) => n + w, 0);
  const got = parts.reduce((n, [r, w]) => n + (r.ok === true ? w : r.ok === null ? w / 2 : 0), 0);
  return { score: Math.round((got / total) * 100), reasons: parts.map(([r]) => r), usedDefaults };
}

/** True when each fits the other's preferences well. */
export function isMutual(me: Biodata, them: Biodata) {
  return matchFor(me, them).score >= 75 && matchFor(them, me).score >= 75;
}

const words = (s?: string) =>
  (s ?? "")
    .toLowerCase()
    .split(/[,/&]| and /)
    .map((w) => w.trim())
    .filter((w) => w.length > 2);

/** Small things two people share, for "Things in common" and chat icebreakers. */
export function commonGround(me: Biodata, them: Biodata): string[] {
  const out: string[] = [];
  if (me.city && lc(me.city) === lc(them.city)) out.push(`Both in ${them.city}`);
  else if (me.state && me.state === them.state) out.push(`Both from ${them.state}`);
  if (me.motherTongue && me.motherTongue === them.motherTongue) out.push(`Both speak ${them.motherTongue}`);
  if (me.diet && me.diet === them.diet) out.push(`Both ${them.diet.toLowerCase()}`);
  if (me.community && lc(me.community) === lc(them.community)) out.push(`Both ${them.community}`);
  if (me.sector && me.sector === them.sector && !["Studying", "Not working"].includes(me.sector)) out.push(`Both work in ${me.sector.split(" (")[0].toLowerCase()}`);
  if (me.familyType && me.familyType === them.familyType) out.push(`Both from a ${them.familyType.toLowerCase()}`);
  const mine = words(me.hobbies);
  for (const h of words(them.hobbies)) {
    if (mine.some((m) => m === h || m.includes(h) || h.includes(m))) out.push(`Both enjoy ${h}`);
  }
  return [...new Set(out)].slice(0, 6);
}

/** Conversation starters drawn from their biodata. */
export function icebreakers(me: Biodata, them: Biodata): string[] {
  const first = (them.fullName ?? "").split(" ")[0] || "there";
  const out: string[] = [];
  const p = them.prompts?.[0];
  if (p) out.push(`I loved your answer to "${p.q.replace(/…$/, "")}". Tell me more?`);
  const hobby = words(them.hobbies)[0];
  if (hobby) out.push(`Namaste ${first}! I saw you enjoy ${hobby}. How did you get into it?`);
  if (them.occupation) out.push(`What do you enjoy most about being a ${them.occupation.toLowerCase()}?`);
  const shared = commonGround(me, them)[0];
  if (shared) out.push(`${shared}, it seems! What's your favourite thing about that?`);
  if (them.city) out.push(`What's one place in ${them.city} you'd take a visitor to?`);
  out.push(`Namaste ${first}, thank you for connecting. How is your week going?`);
  return [...new Set(out)].slice(0, 4);
}
