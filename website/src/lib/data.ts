import "server-only";
import { randomBytes } from "node:crypto";
import { kv } from "./kv";
import { MAX_PROMPTS, PROMPTS, PROMPT_ANSWER_MAX } from "./prompts";
import {
  BIODATA_TEXT_FIELDS,
  FAMILY_REACTIONS,
  MEET_MODES,
  OWNER_ONLY_FIELDS,
  PRIVATE_FIELDS,
  type Biodata,
  type BiodataTextField,
  type FamilyVote,
  type Gender,
  type Interest,
  type MeetMode,
  type MeetStatus,
  type Message,
  type Notice,
  type PartnerPrefs,
  type PromptAnswer,
  type Relation,
  type Report,
  type User,
} from "./types";

/*
 Keys
   user:{id}            User JSON             phone:{phone}   user id
   bio:{id}             Biodata JSON          bios:pub        zset of published ids by updatedAt
   int:{from}:{to}      Interest JSON         in:{id} out:{id} conn:{id}  zsets of other user ids
   saved:{id}           set of saved ids      blocked:{id}    ids this user blocked (blockedby:{id} is the reverse)
   chat:{cid}           zset of Message JSON by ts
   chats:{id}           zset of other user ids by last message ts
   read:{cid}:{id}      last read ts
   users                zset of all user ids by createdAt
   counter:profile      last profile number handed out
   views:{id}           zset of viewer ids by last view ts     viewcount:{id}  total views
   report:{rid}         Report JSON           reports:open / reports:closed  zsets of report ids by ts
   stats:{name}         running totals        stats:{name}:{yyyy-mm-dd}  daily totals
   settings:announcement  banner text shown to everyone
   notif:{id}           zset of Notice JSON by ts      notifseen:{id}  ts the bell was last opened
   celebrate:{id}       set of member ids whose acceptance this member hasn't celebrated yet
   passed:{id}          zset of ids passed on in Discover, by ts (hidden from the deck for 30 days)
   famtok:{id}          this member's family review token     fam:{token}  owner id (both expire)
   famvote:{owner}:{id} FamilyVote[] JSON: family reactions to a profile on the owner's list
   typing:{cid}:{id}    set for a few seconds while someone types
   meets:{cid}          JSON map of meeting message id -> status
*/

export { ageFrom, completeness, publishProblems } from "./bio";
import { publishProblems } from "./bio";

const parse = <T>(s: string | null): T | null => (s ? (JSON.parse(s) as T) : null);
export const newId = () => randomBytes(9).toString("base64url");

// ---------- users ----------

export async function getUser(id: string) {
  return parse<User>(await kv().get(`user:${id}`));
}

export async function getUsers(ids: string[]) {
  const rows = await kv().mget(ids.map((i) => `user:${i}`));
  return rows.map((r) => parse<User>(r));
}

export async function findUserIdByPhone(phone: string) {
  return await kv().get(`phone:${phone}`);
}

export const day = (ts = Date.now()) => new Date(ts + 5.5 * 3600_000).toISOString().slice(0, 10); // IST date

export async function bumpStat(name: string) {
  await Promise.all([kv().incr(`stats:${name}`), kv().incr(`stats:${name}:${day()}`, 60 * 60 * 24 * 60)]);
}

export async function createUser(input: { name: string; phone: string; gender: Gender; createdFor: string; passHash: string }) {
  const id = newId();
  const claimed = await kv().set(`phone:${input.phone}`, id, { nx: true });
  if (!claimed) return null;
  const now = Date.now();
  const profileNo = 1000 + (await kv().incr("counter:profile"));
  const user: User = { id, ...input, createdAt: now, lastActive: now, profileNo, status: "active" };
  await kv().set(`user:${id}`, JSON.stringify(user));
  const bio: Biodata = { userId: id, gender: input.gender, photos: [], published: false, updatedAt: now, fullName: input.name, profileNo };
  await kv().set(`bio:${id}`, JSON.stringify(bio));
  await kv().zadd("users", now, id);
  await bumpStat("signups");
  return user;
}

export async function saveUser(user: User) {
  await kv().set(`user:${user.id}`, JSON.stringify(user));
}

/** Records activity at most once a minute, and backfills fields older accounts lack. */
export async function touchUser(user: User) {
  const now = Date.now();
  if (user.lastActive && now - user.lastActive < 60_000 && user.profileNo) return user;
  const next: User = { ...user, lastActive: now, status: user.status ?? "active" };
  if (!next.profileNo) {
    next.profileNo = 1000 + (await kv().incr("counter:profile"));
    const bio = await getBiodata(user.id);
    if (bio) await kv().set(`bio:${user.id}`, JSON.stringify({ ...bio, profileNo: next.profileNo }));
  }
  await saveUser(next);
  await kv().zadd("users", user.createdAt, user.id);
  return next;
}

export const profileCode = (n?: number) => (n ? `SS${n}` : "");

export function activityLabel(ts?: number) {
  if (!ts) return "";
  const mins = Math.floor((Date.now() - ts) / 60_000);
  if (mins < 3) return "Online";
  if (mins < 60) return `Active ${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `Active ${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return days < 30 ? `Active ${days} day${days === 1 ? "" : "s"} ago` : "Active over a month ago";
}

// ---------- biodata ----------

export async function getBiodata(id: string) {
  return parse<Biodata>(await kv().get(`bio:${id}`));
}

export async function getBiodatas(ids: string[]) {
  const rows = await kv().mget(ids.map((i) => `bio:${i}`));
  return rows.map((r) => parse<Biodata>(r));
}

export function cleanBiodataInput(input: Record<string, unknown>) {
  const out: Partial<Record<BiodataTextField, string>> = {};
  for (const key of BIODATA_TEXT_FIELDS) {
    const v = input[key];
    if (typeof v === "string") out[key] = v.trim().slice(0, key === "about" || key === "expectations" ? 700 : 300);
  }
  if (out.contactPhone) out.contactPhone = out.contactPhone.replace(/[^\d+ ]/g, "").slice(0, 16);
  if (out.dob && !/^\d{4}-\d{2}-\d{2}$/.test(out.dob)) delete out.dob;
  return out;
}

export async function saveBiodata(id: string, patch: Partial<Biodata>) {
  const cur = await getBiodata(id);
  if (!cur) throw new Error("Biodata not found");
  const next: Biodata = { ...cur, ...patch, userId: id, gender: cur.gender, updatedAt: Date.now() };
  if (next.published && (publishProblems(next).length || next.adminHidden)) next.published = false;
  await kv().set(`bio:${id}`, JSON.stringify(next));
  if (next.published) await kv().zadd("bios:pub", next.updatedAt, id);
  else await kv().zrem("bios:pub", id);
  return next;
}

/** What a viewer is allowed to see of someone's biodata. */
export function biodataForViewer(b: Biodata, relation: Relation): Biodata {
  if (relation.kind === "self") return b;
  const copy: Biodata = { ...b };
  for (const f of OWNER_ONLY_FIELDS) delete copy[f];
  if (relation.kind !== "connected") for (const f of PRIVATE_FIELDS) delete copy[f];
  const showPhotos = b.photoPrivacy !== "interest" || ["connected", "received", "declined-by-me"].includes(relation.kind);
  return showPhotos ? copy : withoutPhotos(copy);
}

/** Can the viewer see b's photos? `theirs` is b's interest in the viewer, `mine` the viewer's interest in b. */
export function photosVisible(b: Biodata, theirs?: Interest | null, mine?: Interest | null) {
  return b.photoPrivacy !== "interest" || Boolean(theirs) || mine?.status === "accepted";
}

export function withoutPhotos(b: Biodata): Biodata {
  return b.photos.length ? { ...b, photos: [], photosHidden: b.photos.length } : b;
}

/** A biodata as it may appear in lists: no private fields, photos only if allowed. */
export function forList(b: Biodata, showPhotos: boolean): Biodata {
  const copy: Biodata = { ...b };
  for (const f of [...OWNER_ONLY_FIELDS, ...PRIVATE_FIELDS]) delete copy[f];
  return showPhotos ? copy : withoutPhotos(copy);
}

export function cleanPrefs(input: unknown): PartnerPrefs {
  const p = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
  const num = (v: unknown, lo: number, hi: number) => {
    const n = Math.round(Number(v));
    return Number.isFinite(n) && n >= lo && n <= hi ? n : undefined;
  };
  const list = (v: unknown) =>
    Array.isArray(v) ? [...new Set(v.filter((x): x is string => typeof x === "string").map((x) => x.trim().slice(0, 60)).filter(Boolean))].slice(0, 40) : undefined;
  const out: PartnerPrefs = {
    ageMin: num(p.ageMin, 18, 80),
    ageMax: num(p.ageMax, 18, 80),
    heightMin: num(p.heightMin, 48, 90),
    heightMax: num(p.heightMax, 48, 90),
    religions: list(p.religions),
    motherTongues: list(p.motherTongues),
    marital: list(p.marital),
    diets: list(p.diets),
    states: list(p.states),
    communities: typeof p.communities === "string" ? p.communities.trim().slice(0, 160) : undefined,
    manglik: p.manglik === "Yes" || p.manglik === "No" ? p.manglik : "",
  };
  if (out.ageMin && out.ageMax && out.ageMin > out.ageMax) [out.ageMin, out.ageMax] = [out.ageMax, out.ageMin];
  if (out.heightMin && out.heightMax && out.heightMin > out.heightMax) [out.heightMin, out.heightMax] = [out.heightMax, out.heightMin];
  return Object.fromEntries(Object.entries(out).filter(([, v]) => v !== undefined && v !== "" && !(Array.isArray(v) && !v.length))) as PartnerPrefs;
}

export function cleanPrompts(input: unknown): PromptAnswer[] {
  if (!Array.isArray(input)) return [];
  const seen = new Set<string>();
  const out: PromptAnswer[] = [];
  for (const item of input) {
    const q = typeof item?.q === "string" ? item.q : "";
    const a = typeof item?.a === "string" ? item.a.trim().slice(0, PROMPT_ANSWER_MAX) : "";
    if (!(PROMPTS as readonly string[]).includes(q) || !a || seen.has(q)) continue;
    seen.add(q);
    out.push({ q, a });
    if (out.length === MAX_PROMPTS) break;
  }
  return out;
}

export async function listPublishedIds(limit = 1000) {
  return await kv().zrevrange("bios:pub", 0, limit - 1);
}

// ---------- blocking ----------

export async function isBlockedEitherWay(a: string, b: string) {
  const [x, y] = await Promise.all([kv().sismember(`blocked:${a}`, b), kv().sismember(`blocked:${b}`, a)]);
  return x || y;
}

/** Everyone hidden from this user: people they blocked and people who blocked them. */
export async function hiddenFor(me: string) {
  const [mine, theirs] = await Promise.all([kv().smembers(`blocked:${me}`), kv().smembers(`blockedby:${me}`)]);
  return new Set([...mine, ...theirs]);
}

export async function blockedByThem(me: string, other: string) {
  return await kv().sismember(`blocked:${other}`, me);
}

export async function blockUser(me: string, other: string) {
  await Promise.all([kv().sadd(`blocked:${me}`, other), kv().sadd(`blockedby:${other}`, me)]);
}

export async function unblockUser(me: string, other: string) {
  await Promise.all([kv().srem(`blocked:${me}`, other), kv().srem(`blockedby:${other}`, me)]);
}

// ---------- interests ----------

async function getInterest(from: string, to: string) {
  return parse<Interest>(await kv().get(`int:${from}:${to}`));
}

export async function relationBetween(me: string, other: string): Promise<Relation> {
  if (me === other) return { kind: "self" };
  if (await kv().sismember(`blocked:${me}`, other)) return { kind: "blocked" };
  const [mine, theirs] = await Promise.all([getInterest(me, other), getInterest(other, me)]);
  const accepted = [mine, theirs].find((i) => i?.status === "accepted");
  if (accepted) return { kind: "connected", interest: accepted };
  if (theirs?.status === "pending") return { kind: "received", interest: theirs };
  if (mine?.status === "pending") return { kind: "sent", interest: mine };
  if (mine?.status === "declined") return { kind: "declined-by-them", interest: mine };
  if (theirs?.status === "declined") return { kind: "declined-by-me", interest: theirs };
  return { kind: "none" };
}

async function firstName(id: string) {
  const b = await getBiodata(id);
  return (b?.fullName ?? "Someone").split(" ")[0];
}

/** `acceptor` said yes to `interest`, which the other person sent. */
async function connect(acceptor: string, other: string, interest: Interest) {
  const now = Date.now();
  interest.status = "accepted";
  interest.updatedAt = now;
  await bumpStat("connections");
  await kv().set(`int:${interest.from}:${interest.to}`, JSON.stringify(interest));
  await Promise.all([kv().zadd(`conn:${acceptor}`, now, other), kv().zadd(`conn:${other}`, now, acceptor)]);
  // The note that came with the interest opens the conversation, like a first message.
  if (interest.note) {
    const msg: Message = { id: `${interest.createdAt}-note`, from: interest.from, text: interest.note, ts: interest.createdAt, kind: "note", quote: interest.liked };
    const cid = chatId(acceptor, other);
    await kv().zadd(`chat:${cid}`, msg.ts, JSON.stringify(msg));
    await Promise.all([kv().zadd(`chats:${acceptor}`, now, other), kv().zadd(`chats:${other}`, now, acceptor), kv().set(`read:${cid}:${interest.from}`, String(msg.ts))]);
  }
  await kv().sadd(`celebrate:${other}`, acceptor);
  await notify(other, { type: "accepted", who: acceptor, text: `${await firstName(acceptor)} accepted your interest. You can chat now.`, link: `/chat/${acceptor}` });
}

export async function sendInterest(me: string, other: string, extra: { note?: string; liked?: string } = {}) {
  const rel = await relationBetween(me, other);
  if (rel.kind === "received") {
    await connect(me, other, rel.interest);
    return "connected" as const;
  }
  if (rel.kind !== "none") return rel.kind;
  if (await isBlockedEitherWay(me, other)) return "blocked" as const;
  const now = Date.now();
  const note = extra.note?.trim().slice(0, 300) || undefined;
  const liked = note ? extra.liked?.trim().slice(0, 240) || undefined : undefined;
  const interest: Interest = { from: me, to: other, status: "pending", createdAt: now, updatedAt: now, note, liked };
  await kv().set(`int:${me}:${other}`, JSON.stringify(interest));
  await Promise.all([kv().zadd(`out:${me}`, now, other), kv().zadd(`in:${other}`, now, me)]);
  await kv().zrem(`passed:${me}`, other);
  await bumpStat("interests");
  const name = await firstName(me);
  await notify(other, { type: "interest", who: me, text: note ? `${name} sent you an interest with a note.` : `${name} sent you an interest.`, link: "/interests" });
  return "sent" as const;
}

export async function respondInterest(me: string, from: string, accept: boolean) {
  const interest = await getInterest(from, me);
  if (!interest || interest.status !== "pending") return false;
  if (accept) {
    await connect(me, from, interest);
  } else {
    interest.status = "declined";
    interest.updatedAt = Date.now();
    await kv().set(`int:${from}:${me}`, JSON.stringify(interest));
  }
  return true;
}

export async function withdrawInterest(me: string, to: string) {
  const interest = await getInterest(me, to);
  if (!interest || interest.status !== "pending") return false;
  await kv().del(`int:${me}:${to}`);
  await Promise.all([kv().zrem(`out:${me}`, to), kv().zrem(`in:${to}`, me)]);
  return true;
}

export async function listInterestIds(me: string) {
  const [received, sent, connected] = await Promise.all([
    kv().zrevrange(`in:${me}`, 0, 199),
    kv().zrevrange(`out:${me}`, 0, 199),
    kv().zrevrange(`conn:${me}`, 0, 499),
  ]);
  return { received, sent, connected };
}

export async function interestsFor(me: string, others: string[]) {
  const keys = others.flatMap((o) => [`int:${me}:${o}`, `int:${o}:${me}`]);
  const rows = await kv().mget(keys);
  const map = new Map<string, { mine: Interest | null; theirs: Interest | null }>();
  others.forEach((o, i) => map.set(o, { mine: parse<Interest>(rows[i * 2]), theirs: parse<Interest>(rows[i * 2 + 1]) }));
  return map;
}

export async function pendingReceivedCount(me: string) {
  const ids = await kv().zrevrange(`in:${me}`, 0, 199);
  if (!ids.length) return 0;
  const rows = await kv().mget(ids.map((o) => `int:${o}:${me}`));
  return rows.filter((r) => parse<Interest>(r)?.status === "pending").length;
}

// ---------- saved ----------

export async function savedIds(me: string) {
  return await kv().smembers(`saved:${me}`);
}

export async function setSaved(me: string, other: string, saved: boolean) {
  if (saved) await kv().sadd(`saved:${me}`, other);
  else await kv().srem(`saved:${me}`, other);
}

// ---------- chat ----------

export const chatId = (a: string, b: string) => (a < b ? `${a}_${b}` : `${b}_${a}`);

export async function canChat(me: string, other: string) {
  if (me === other) return false;
  if (await isBlockedEitherWay(me, other)) return false;
  return (await kv().zscore(`conn:${me}`, other)) !== null;
}

export async function sendMessage(me: string, other: string, text: string) {
  const cid = chatId(me, other);
  const ts = Date.now();
  const msg: Message = { id: `${ts}-${randomBytes(4).toString("hex")}`, from: me, text, ts };
  await kv().zadd(`chat:${cid}`, ts, JSON.stringify(msg));
  await Promise.all([
    kv().zadd(`chats:${me}`, ts, other),
    kv().zadd(`chats:${other}`, ts, me),
    kv().set(`read:${cid}:${me}`, String(ts)),
  ]);
  await bumpStat("messages");
  return msg;
}

export async function getMessages(me: string, other: string, after: number) {
  const cid = chatId(me, other);
  const raw = after > 0 ? await kv().zafter(`chat:${cid}`, after, 200) : await kv().zlast(`chat:${cid}`, 200);
  return raw.map((r) => JSON.parse(r) as Message);
}

export async function markRead(me: string, other: string, ts: number) {
  const cid = chatId(me, other);
  const cur = Number((await kv().get(`read:${cid}:${me}`)) ?? 0);
  if (ts > cur) await kv().set(`read:${cid}:${me}`, String(ts));
}

export async function readMarker(user: string, other: string) {
  return Number((await kv().get(`read:${chatId(user, other)}:${user}`)) ?? 0);
}

export async function listChats(me: string) {
  const others = await kv().zrevrange(`chats:${me}`, 0, 99);
  return await Promise.all(
    others.map(async (o) => {
      const cid = chatId(me, o);
      const [last, read] = await Promise.all([kv().zlast(`chat:${cid}`, 1), kv().get(`read:${cid}:${me}`)]);
      const lastMsg = last[0] ? (JSON.parse(last[0]) as Message) : null;
      const readTs = Number(read ?? 0);
      const newer = await kv().zafter(`chat:${cid}`, readTs, 100);
      const unread = newer.map((r) => JSON.parse(r) as Message).filter((m) => m.from !== me).length;
      return { other: o, last: lastMsg, unread };
    }),
  );
}

export async function unreadTotal(me: string) {
  const chats = await listChats(me);
  return chats.reduce((n, c) => n + c.unread, 0);
}

export type ChatSummary = {
  id: string;
  name: string;
  photo: string | null;
  last: { text: string; ts: number; mine: boolean } | null;
  unread: number;
};

/** Everyone this user can chat with, most recent conversation first. */
export async function chatListFor(me: string): Promise<ChatSummary[]> {
  const [chats, conns, hidden] = await Promise.all([
    listChats(me),
    kv().zrevrange(`conn:${me}`, 0, 499),
    hiddenFor(me),
  ]);
  const withChat = new Set(chats.map((c) => c.other));
  const ids = [...chats.map((c) => c.other), ...conns.filter((c) => !withChat.has(c))].filter((i) => !hidden.has(i));
  const bios = await getBiodatas(ids);
  const byId = new Map(chats.map((c) => [c.other, c]));
  return ids.map((id, n) => {
    const c = byId.get(id);
    return {
      id,
      name: bios[n]?.fullName ?? "Unnamed",
      photo: bios[n]?.photos[0] ?? null,
      last: c?.last ? { text: c.last.text, ts: c.last.ts, mine: c.last.from === me } : null,
      unread: c?.unread ?? 0,
    };
  });
}

// ---------- profile views ----------

export async function recordView(viewer: string, target: string) {
  if (viewer === target) return;
  const key = `views:${target}`;
  const last = await kv().zscore(key, viewer);
  if (last && Date.now() - last < 30 * 60_000) return; // count a visitor again only after 30 minutes
  await Promise.all([kv().zadd(key, Date.now(), viewer), kv().incr(`viewcount:${target}`)]);
  if (await kv().set(`vn:${target}:${viewer}`, "1", { nx: true, ex: 60 * 60 * 24 })) {
    await notify(target, { type: "view", who: viewer, text: `${await firstName(viewer)} viewed your profile.`, link: `/profile/${viewer}` });
  }
}

export async function viewsFor(id: string) {
  const [count, recent] = await Promise.all([kv().get(`viewcount:${id}`), kv().zrevrange(`views:${id}`, 0, 11)]);
  return { count: Number(count ?? 0), recent };
}

// ---------- reports ----------

export async function createReport(r: Omit<Report, "id" | "ts" | "status">) {
  const report: Report = { ...r, id: newId(), ts: Date.now(), status: "open" };
  await kv().set(`report:${report.id}`, JSON.stringify(report));
  await kv().zadd("reports:open", report.ts, report.id);
  return report;
}

export async function listReports(which: "open" | "closed", limit = 200) {
  const ids = await kv().zrevrange(`reports:${which}`, 0, limit - 1);
  const rows = await kv().mget(ids.map((i) => `report:${i}`));
  return rows.map((r) => parse<Report>(r)).filter((r): r is Report => Boolean(r));
}

export async function closeReport(id: string, status: "dismissed" | "actioned") {
  const r = parse<Report>(await kv().get(`report:${id}`));
  if (!r) return null;
  r.status = status;
  await kv().set(`report:${id}`, JSON.stringify(r));
  await kv().zrem("reports:open", id);
  await kv().zadd("reports:closed", Date.now(), id);
  return r;
}

export async function reportsAgainst(target: string) {
  const all = [...(await listReports("open", 500)), ...(await listReports("closed", 500))];
  return all.filter((r) => r.target === target);
}

// ---------- announcement ----------

export async function getAnnouncement() {
  return (await kv().get("settings:announcement")) ?? "";
}

export async function setAnnouncement(text: string) {
  if (text.trim()) await kv().set("settings:announcement", text.trim().slice(0, 280));
  else await kv().del("settings:announcement");
}

// ---------- admin ----------

export async function listUserIds(limit = 2000) {
  return await kv().zrevrange("users", 0, limit - 1);
}

export async function userCount() {
  return await kv().zcard("users");
}

export async function statTotals() {
  const names = ["signups", "interests", "connections", "messages", "meetings", "family_votes"];
  const vals = await kv().mget(names.map((n) => `stats:${n}`));
  return Object.fromEntries(names.map((n, i) => [n, Number(vals[i] ?? 0)])) as Record<string, number>;
}

export async function dailyStat(name: string, days = 14) {
  const dates = Array.from({ length: days }, (_, i) => day(Date.now() - (days - 1 - i) * 86400_000));
  const vals = await kv().mget(dates.map((d) => `stats:${name}:${d}`));
  return dates.map((d, i) => ({ date: d, value: Number(vals[i] ?? 0) }));
}

/** Suspends or restores an account. Suspended members can't log in and their biodata is hidden. */
export async function setSuspended(id: string, suspended: boolean) {
  const user = await getUser(id);
  if (!user) return null;
  await saveUser({ ...user, status: suspended ? "suspended" : "active" });
  if (suspended) await saveBiodata(id, { published: false });
  return user;
}

/** Permanently removes an account, its biodata, connections and saved lists. Messages stay with the other side. */
export async function deleteAccount(id: string) {
  const user = await getUser(id);
  const bio = await getBiodata(id);
  const conns = await kv().zrevrange(`conn:${id}`, 0, 999);
  await Promise.all(conns.map((o) => kv().zrem(`conn:${o}`, id)));
  const [ins, outs] = await Promise.all([kv().zrevrange(`in:${id}`, 0, 999), kv().zrevrange(`out:${id}`, 0, 999)]);
  await Promise.all([...ins.map((o) => kv().zrem(`out:${o}`, id)), ...outs.map((o) => kv().zrem(`in:${o}`, id))]);
  await kv().zrem("bios:pub", id);
  await kv().zrem("users", id);
  const tok = await kv().get(`famtok:${id}`);
  const keys = [`user:${id}`, `bio:${id}`, `conn:${id}`, `in:${id}`, `out:${id}`, `saved:${id}`, `chats:${id}`, `views:${id}`, `viewcount:${id}`,
    `notif:${id}`, `notifseen:${id}`, `celebrate:${id}`, `passed:${id}`, `famtok:${id}`];
  if (tok) keys.push(`fam:${tok}`);
  if (user?.phone) keys.push(`phone:${user.phone}`);
  await kv().del(...keys);
  return { user, bio };
}

// ---------- notifications ----------

export async function notify(uid: string, n: Omit<Notice, "id" | "ts">) {
  if (uid.startsWith("sample-")) return;
  const notice: Notice = { ...n, id: newId(), ts: Date.now() };
  await kv().zadd(`notif:${uid}`, notice.ts, JSON.stringify(notice));
  await kv().ztrim(`notif:${uid}`, 60);
}

export async function listNotices(uid: string, limit = 40) {
  const raw = await kv().zrevrange(`notif:${uid}`, 0, limit - 1);
  return raw.map((r) => JSON.parse(r) as Notice);
}

export async function unseenNoticeCount(uid: string) {
  const seen = Number((await kv().get(`notifseen:${uid}`)) ?? 0);
  return (await kv().zafter(`notif:${uid}`, seen, 99)).length;
}

export async function noticesSeenAt(uid: string) {
  return Number((await kv().get(`notifseen:${uid}`)) ?? 0);
}

export async function markNoticesSeen(uid: string) {
  await kv().set(`notifseen:${uid}`, String(Date.now()));
}

// ---------- celebrations ----------

/** Someone accepted this member's interest and they haven't seen the celebration yet. */
export async function pendingCelebration(uid: string) {
  const ids = await kv().smembers(`celebrate:${uid}`);
  for (const id of ids) {
    const b = await getBiodata(id);
    if (b) return { id, name: (b.fullName ?? "").split(" ")[0], photo: b.photoPrivacy === "interest" ? null : (b.photos[0] ?? null) };
    await kv().srem(`celebrate:${uid}`, id);
  }
  return null;
}

export async function clearCelebration(uid: string, other: string) {
  await kv().srem(`celebrate:${uid}`, other);
}

// ---------- discover ----------

const PASS_DAYS = 30;

export async function passProfile(me: string, other: string) {
  await kv().zadd(`passed:${me}`, Date.now(), other);
}

export async function undoPass(me: string, other: string) {
  await kv().zrem(`passed:${me}`, other);
}

export async function recentlyPassed(me: string) {
  return new Set(await kv().zafter(`passed:${me}`, Date.now() - PASS_DAYS * 86400_000, 5000));
}

// ---------- family review ----------

const FAMILY_DAYS = 14;

export async function familyLink(uid: string) {
  const token = await kv().get(`famtok:${uid}`);
  if (!token) return null;
  const raw = await kv().get(`fam:${token}`);
  if (!raw) return null;
  const { expires } = JSON.parse(raw) as { owner: string; expires: number };
  return { token, expires };
}

export async function createFamilyLink(uid: string) {
  const old = await kv().get(`famtok:${uid}`);
  if (old) await kv().del(`fam:${old}`);
  const token = randomBytes(12).toString("base64url");
  const expires = Date.now() + FAMILY_DAYS * 86400_000;
  await kv().set(`fam:${token}`, JSON.stringify({ owner: uid, expires }), { ex: FAMILY_DAYS * 86400 });
  await kv().set(`famtok:${uid}`, token, { ex: FAMILY_DAYS * 86400 });
  return { token, expires };
}

export async function revokeFamilyLink(uid: string) {
  const old = await kv().get(`famtok:${uid}`);
  if (old) await kv().del(`fam:${old}`, `famtok:${uid}`);
}

export async function familyOwner(token: string) {
  if (!/^[\w-]{10,40}$/.test(token)) return null;
  const raw = await kv().get(`fam:${token}`);
  if (!raw) return null;
  const { owner, expires } = JSON.parse(raw) as { owner: string; expires: number };
  return expires > Date.now() ? owner : null;
}

export type FamilyItem = { bio: Biodata; group: "shortlist" | "interested" | "connected"; votes: FamilyVote[] };

/** The profiles a member's family can review: their shortlist, people interested in them, and connections. */
export async function familyList(owner: string): Promise<FamilyItem[]> {
  const [saved, ids, hidden] = await Promise.all([savedIds(owner), listInterestIds(owner), hiddenFor(owner)]);
  const rels = await interestsFor(owner, [...new Set([...saved, ...ids.received, ...ids.connected])]);
  const groups = new Map<string, FamilyItem["group"]>();
  for (const id of ids.connected) groups.set(id, "connected");
  for (const id of ids.received) if (!groups.has(id) && rels.get(id)?.theirs?.status === "pending") groups.set(id, "interested");
  for (const id of saved) if (!groups.has(id)) groups.set(id, "shortlist");
  const list = [...groups.keys()].filter((id) => !hidden.has(id)).slice(0, 36);
  const [bios, votes] = await Promise.all([getBiodatas(list), kv().mget(list.map((id) => `famvote:${owner}:${id}`))]);
  const out: FamilyItem[] = [];
  list.forEach((id, i) => {
    const b = bios[i];
    const group = groups.get(id)!;
    if (!b) return;
    if (group !== "connected" && (!b.published || b.familyShare === false)) return;
    const r = rels.get(id);
    out.push({ bio: forList(b, photosVisible(b, r?.theirs, r?.mine)), group, votes: parse<FamilyVote[]>(votes[i]) ?? [] });
  });
  return out;
}

export async function familyVotesFor(owner: string, profile: string) {
  return parse<FamilyVote[]>(await kv().get(`famvote:${owner}:${profile}`)) ?? [];
}

export async function addFamilyVote(owner: string, profile: string, vote: Omit<FamilyVote, "ts">) {
  if (!FAMILY_REACTIONS.some((r) => r.id === vote.reaction)) return null;
  const key = `famvote:${owner}:${profile}`;
  const cur = parse<FamilyVote[]>(await kv().get(key)) ?? [];
  const name = vote.name.trim().slice(0, 30);
  const next: FamilyVote = { name, reaction: vote.reaction, comment: vote.comment?.trim().slice(0, 200) || undefined, ts: Date.now() };
  const list = [...cur.filter((v) => v.name.toLowerCase() !== name.toLowerCase()), next].slice(-20);
  await kv().set(key, JSON.stringify(list));
  await bumpStat("family_votes");
  if (await kv().set(`fvn:${owner}:${profile}:${name.toLowerCase()}`, "1", { nx: true, ex: 3600 })) {
    const r = FAMILY_REACTIONS.find((x) => x.id === vote.reaction)!;
    await notify(owner, { type: "family", who: profile, text: `${r.emoji} ${name} ${r.verb} ${await firstName(profile)}'s profile${next.comment ? `: "${next.comment}"` : "."}`, link: "/family" });
  }
  return list;
}

// ---------- chat extras ----------

export async function setTyping(me: string, other: string) {
  await kv().set(`typing:${chatId(me, other)}:${me}`, "1", { ex: 6 });
}

export async function isTyping(who: string, withWhom: string) {
  return Boolean(await kv().get(`typing:${chatId(who, withWhom)}:${who}`));
}

export async function sendMeet(me: string, other: string, meet: { when: string; mode: MeetMode; place?: string }) {
  if (!MEET_MODES.includes(meet.mode)) throw new Error("bad mode");
  const cid = chatId(me, other);
  const ts = Date.now();
  const msg: Message = { id: `${ts}-${randomBytes(4).toString("hex")}`, from: me, text: `Proposed a ${meet.mode.toLowerCase()}`, ts, kind: "meet", meet };
  await kv().zadd(`chat:${cid}`, ts, JSON.stringify(msg));
  await Promise.all([kv().zadd(`chats:${me}`, ts, other), kv().zadd(`chats:${other}`, ts, me), kv().set(`read:${cid}:${me}`, String(ts))]);
  await setMeetStatus(cid, msg.id, "proposed");
  await bumpStat("meetings");
  await notify(other, { type: "meet", who: me, text: `${await firstName(me)} proposed a ${meet.mode.toLowerCase()}.`, link: `/chat/${me}` });
  return msg;
}

async function setMeetStatus(cid: string, mid: string, status: MeetStatus) {
  const cur = parse<Record<string, MeetStatus>>(await kv().get(`meets:${cid}`)) ?? {};
  cur[mid] = status;
  await kv().set(`meets:${cid}`, JSON.stringify(cur));
}

export async function meetStatuses(me: string, other: string) {
  return parse<Record<string, MeetStatus>>(await kv().get(`meets:${chatId(me, other)}`)) ?? {};
}

/** The invited person accepts or declines a proposed meeting. */
export async function respondMeet(me: string, other: string, mid: string, accept: boolean) {
  const cid = chatId(me, other);
  const statuses = await meetStatuses(me, other);
  if (statuses[mid] !== "proposed") return null;
  const recent = await kv().zlast(`chat:${cid}`, 400);
  const msg = recent.map((r) => JSON.parse(r) as Message).find((m) => m.id === mid);
  if (!msg || msg.kind !== "meet" || msg.from === me || !msg.meet) return null;
  await setMeetStatus(cid, mid, accept ? "accepted" : "declined");
  const what = msg.meet.mode.toLowerCase();
  const reply = accept ? `Accepted the ${what}. See you then! 🙏` : `Can't make the ${what} at that time. Could we find another time?`;
  return await sendMessage(me, other, reply);
}
