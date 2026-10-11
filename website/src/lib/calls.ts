import "server-only";
import { randomBytes } from "node:crypto";
import { kv } from "./kv";
import { bumpStat, chatId, getBiodata, notify, sendMessage } from "./data";
import type { CallOutcome, CallStatus } from "./types";

/*
 In-app voice and video calls between connected members, peer to peer over WebRTC.
 The server only relays the setup messages (offer, answer, ICE candidates).

 Keys
   call:{id}          Call JSON (expires after 3 hours)
   ring:{uid}         id of the call ringing for this member (expires after 50 seconds)
   sig:{id}:{uid}     zset of signals waiting for this member, scored by sigseq:{id}
   calls:{cid}        JSON map of call id -> outcome, shown on the call card in chat
*/

export type Call = {
  id: string;
  from: string;
  to: string;
  video: boolean;
  status: CallStatus;
  startedAt: number;
  answeredAt?: number;
  endedAt?: number;
};

const RING_MS = 45_000;
const TTL = 3 * 3600;

const parse = <T>(s: string | null) => (s ? (JSON.parse(s) as T) : null);

async function save(call: Call) {
  await kv().set(`call:${call.id}`, JSON.stringify(call), { ex: TTL });
  const cid = chatId(call.from, call.to);
  const outcomes = parse<Record<string, CallOutcome>>(await kv().get(`calls:${cid}`)) ?? {};
  outcomes[call.id] = {
    status: call.status,
    dur: call.answeredAt && call.endedAt ? Math.round((call.endedAt - call.answeredAt) / 1000) : undefined,
  };
  const ids = Object.keys(outcomes);
  for (const old of ids.slice(0, Math.max(0, ids.length - 100))) delete outcomes[old];
  await kv().set(`calls:${cid}`, JSON.stringify(outcomes));
}

async function cleanup(call: Call) {
  await kv().del(`sig:${call.id}:${call.from}`, `sig:${call.id}:${call.to}`, `sigseq:${call.id}`);
  if ((await kv().get(`ring:${call.to}`)) === call.id) await kv().del(`ring:${call.to}`);
}

const firstName = async (id: string) => ((await getBiodata(id))?.fullName ?? "Someone").split(" ")[0];

/** Reads a call, turning an unanswered ring into a missed call once it times out. */
export async function getCall(id: string): Promise<Call | null> {
  const call = parse<Call>(await kv().get(`call:${id}`));
  if (call && call.status === "ringing" && Date.now() - call.startedAt > RING_MS) {
    call.status = "missed";
    call.endedAt = Date.now();
    await save(call);
    await cleanup(call);
    await notify(call.to, { type: "meet", who: call.from, text: `Missed ${call.video ? "video" : "voice"} call from ${await firstName(call.from)}.`, link: `/chat/${call.from}` });
  }
  return call;
}

export async function startCall(me: string, other: string, video: boolean) {
  const busy = await kv().get(`ring:${other}`);
  if (busy && busy !== "") {
    const ringing = await getCall(busy);
    if (ringing?.status === "ringing") return { error: "They're on another call. Try again in a minute." as const };
  }
  const id = randomBytes(10).toString("base64url");
  const call: Call = { id, from: me, to: other, video, status: "ringing", startedAt: Date.now() };
  await save(call);
  await kv().set(`ring:${other}`, id, { ex: 50 });
  await sendMessage(me, other, "", { kind: "call", call: { id, video } });
  await bumpStat("calls");
  return { call };
}

export async function incomingCall(uid: string) {
  const id = await kv().get(`ring:${uid}`);
  if (!id) return null;
  const call = await getCall(id);
  if (!call || call.status !== "ringing" || call.to !== uid) return null;
  const bio = await getBiodata(call.from);
  return { id: call.id, video: call.video, from: call.from, name: bio?.fullName ?? "Someone", photo: bio?.photos[0] ?? null };
}

/** Accept, decline or hang up. Returns the updated call, or null if the member isn't part of it. */
export async function updateCall(me: string, id: string, action: "accept" | "decline" | "end") {
  const call = await getCall(id);
  if (!call || (call.from !== me && call.to !== me)) return null;
  if (["ended", "declined", "missed", "cancelled"].includes(call.status)) return call;
  const now = Date.now();
  if (action === "accept") {
    if (call.to !== me || call.status !== "ringing") return call;
    call.status = "active";
    call.answeredAt = now;
    await kv().del(`ring:${me}`);
    await save(call);
    return call;
  }
  if (call.status === "ringing") {
    call.status = call.from === me ? "cancelled" : "declined";
    if (call.status === "cancelled") {
      await notify(call.to, { type: "meet", who: call.from, text: `Missed ${call.video ? "video" : "voice"} call from ${await firstName(call.from)}.`, link: `/chat/${call.from}` });
    }
  } else {
    call.status = "ended";
  }
  call.endedAt = now;
  await save(call);
  await cleanup(call);
  return call;
}

export async function pushSignal(me: string, id: string, data: unknown) {
  const call = await getCall(id);
  if (!call || (call.from !== me && call.to !== me) || !["ringing", "active"].includes(call.status)) return false;
  const to = call.from === me ? call.to : call.from;
  const seq = await kv().incr(`sigseq:${id}`);
  await kv().zadd(`sig:${id}:${to}`, seq, JSON.stringify({ seq, data }));
  return true;
}

export async function pullSignals(me: string, id: string, after: number) {
  const call = await getCall(id);
  if (!call || (call.from !== me && call.to !== me)) return null;
  const raw = await kv().zafter(`sig:${id}:${me}`, after, 200);
  return { call, signals: raw.map((r) => JSON.parse(r) as { seq: number; data: unknown }) };
}

/** STUN servers always; a TURN relay when TURN_URL is set, for networks where direct connections fail. */
export function iceServers() {
  const servers: { urls: string | string[]; username?: string; credential?: string }[] = [
    { urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302", "stun:stun.cloudflare.com:3478"] },
  ];
  if (process.env.TURN_URL) {
    servers.push({ urls: process.env.TURN_URL.split(",").map((u) => u.trim()), username: process.env.TURN_USERNAME, credential: process.env.TURN_CREDENTIAL });
  }
  return servers;
}

export const chatKeyFor = chatId;
