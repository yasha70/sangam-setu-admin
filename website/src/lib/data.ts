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

export async function createUser(input: { name: string; phone: string; gender: Gender; createdFor: string; passHash: string }) {
  const id = newId();
  const claimed = await kv().set(`phone:${input.phone}`, id, { nx: true });
  if (!claimed) return null;
  const user: User = { id, ...input, createdAt: Date.now() };
  await kv().set(`user:${id}`, JSON.stringify(user));
  const bio: Biodata = { userId: id, gender: input.gender, photos: [], published: false, updatedAt: Date.now(), fullName: input.name };
  await kv().set(`bio:${id}`, JSON.stringify(bio));
  return user;
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
  if (next.published && publishProblems(next).length) next.published = false;
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
