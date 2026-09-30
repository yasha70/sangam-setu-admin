import "server-only";
import { randomBytes } from "node:crypto";
import { kv } from "./kv";
import {
  BIODATA_TEXT_FIELDS,
  OWNER_ONLY_FIELDS,
  PRIVATE_FIELDS,
  type Biodata,
  type BiodataTextField,
  type Gender,
  type Interest,
  type Message,
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
  return copy;
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

async function connect(a: string, b: string, interest: Interest) {
  const now = Date.now();
  interest.status = "accepted";
  interest.updatedAt = now;
  await bumpStat("connections");
  await kv().set(`int:${interest.from}:${interest.to}`, JSON.stringify(interest));
  await Promise.all([kv().zadd(`conn:${a}`, now, b), kv().zadd(`conn:${b}`, now, a)]);
}

export async function sendInterest(me: string, other: string) {
  const rel = await relationBetween(me, other);
  if (rel.kind === "received") {
    await connect(me, other, rel.interest);
    return "connected" as const;
  }
  if (rel.kind !== "none") return rel.kind;
  if (await isBlockedEitherWay(me, other)) return "blocked" as const;
  const now = Date.now();
  const interest: Interest = { from: me, to: other, status: "pending", createdAt: now, updatedAt: now };
  await kv().set(`int:${me}:${other}`, JSON.stringify(interest));
  await Promise.all([kv().zadd(`out:${me}`, now, other), kv().zadd(`in:${other}`, now, me)]);
  await bumpStat("interests");
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
  const names = ["signups", "interests", "connections", "messages"];
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
  const keys = [`user:${id}`, `bio:${id}`, `conn:${id}`, `in:${id}`, `out:${id}`, `saved:${id}`, `chats:${id}`, `views:${id}`, `viewcount:${id}`];
  if (user?.phone) keys.push(`phone:${user.phone}`);
  await kv().del(...keys);
  return { user, bio };
}
