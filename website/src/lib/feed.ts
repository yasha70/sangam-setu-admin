import "server-only";
import { gunaBetween } from "./astro";
import { forList, getBiodata, getBiodatas, getUsers, hiddenFor, interestsFor, listPublishedIds, photosVisible, recentlyPassed, savedIds } from "./data";
import { isMutual, matchFor, type Match } from "./match";
import { ensureSamples } from "./samples";
import type { Biodata, Interest, User } from "./types";

export type Candidate = {
  bio: Biodata;
  match: Match;
  mutual: boolean;
  guna: number | null;
  mine: Interest | null;
  theirs: Interest | null;
  lastActive?: number;
  saved: boolean;
  passed: boolean;
};

export type CardState = "none" | "sent" | "received" | "connected" | "declined";

export function stateOf(c: Pick<Candidate, "mine" | "theirs">): CardState {
  if (c.mine?.status === "accepted" || c.theirs?.status === "accepted") return "connected";
  if (c.theirs?.status === "pending") return "received";
  if (c.mine?.status === "pending") return "sent";
  if (c.mine?.status === "declined") return "declined";
  return "none";
}

/** Every published profile of the opposite gender this member may see, scored against their preferences. */
export async function loadCandidates(user: User): Promise<{ me: Biodata; list: Candidate[] }> {
  await ensureSamples();
  const [ids, hidden, saved, me, passed] = await Promise.all([
    listPublishedIds(),
    hiddenFor(user.id),
    savedIds(user.id),
    getBiodata(user.id),
    recentlyPassed(user.id),
  ]);
  const visibleIds = ids.filter((i) => i !== user.id && !hidden.has(i));
  const bios = (await getBiodatas(visibleIds)).filter((b): b is Biodata => Boolean(b?.published && b.gender !== user.gender));
  const [rels, users] = await Promise.all([
    interestsFor(user.id, bios.map((b) => b.userId)),
    getUsers(bios.map((b) => b.userId)),
  ]);
  const savedSet = new Set(saved);
  const meBio = me ?? { userId: user.id, gender: user.gender, photos: [], published: false, updatedAt: 0 };
  const list = bios.map((b, i) => {
    const r = rels.get(b.userId);
    const shown = forList(b, photosVisible(b, r?.theirs, r?.mine));
    const g = gunaBetween(meBio, b).result;
    return {
      bio: shown,
      match: matchFor(meBio, b),
      mutual: isMutual(meBio, b),
      guna: g ? g.total : null,
      mine: r?.mine ?? null,
      theirs: r?.theirs ?? null,
      lastActive: b.sample ? undefined : users[i]?.lastActive,
      saved: savedSet.has(b.userId),
      passed: passed.has(b.userId),
    } satisfies Candidate;
  });
  return { me: meBio, list };
}

const DAY = 86400_000;

/** Overall order for "best match": fit first, then a nudge for complete, active, real profiles. */
export function rankScore(c: Candidate) {
  let s = c.match.score;
  if (c.mutual) s += 8;
  if (c.bio.photos.length || c.bio.photosHidden) s += 4;
  if (c.bio.prompts?.length) s += 3;
  if (c.bio.verified) s += 4;
  if (c.lastActive && Date.now() - c.lastActive < 3 * DAY) s += 4;
  if (c.guna !== null && c.guna >= 18) s += 2;
  if (c.bio.sample) s -= 12;
  return s;
}

function seeded(seed: string) {
  let h = 2166136261;
  for (const ch of seed) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}

/** Today's picks: a handful from the best fits the member hasn't acted on, changing every day. */
export function dailyPicks(list: Candidate[], uid: string, day: string, n = 6) {
  const fresh = list.filter((c) => stateOf(c) === "none" && !c.passed).sort((a, b) => rankScore(b) - rankScore(a));
  const pool = fresh.slice(0, Math.max(n * 3, 12));
  const rnd = seeded(uid + day);
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, n).sort((a, b) => rankScore(b) - rankScore(a));
}

/** The Discover deck: everyone not yet acted on or recently passed, best fit first. */
export function deck(list: Candidate[], limit = 60) {
  return list
    .filter((c) => stateOf(c) === "none" && !c.passed)
    .sort((a, b) => rankScore(b) - rankScore(a))
    .slice(0, limit);
}
