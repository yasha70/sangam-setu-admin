import { canChat, getMessages, isTyping, markRead, meetStatuses, readMarker, sendMeet, sendMessage } from "@/lib/data";
import { fail, ok, readJson, withUser } from "@/lib/api";
import { kv } from "@/lib/kv";
import { MEET_MODES, type MeetMode } from "@/lib/types";

export const dynamic = "force-dynamic";
type Ctx = { params: Promise<{ id: string }> };

export const GET = withUser(async (uid, req, ctx: Ctx) => {
  const { id } = await ctx.params;
  if (!(await canChat(uid, id))) return fail("You can chat once an interest is accepted.", 403);
  const after = Number(new URL(req.url).searchParams.get("after") ?? 0) || 0;
  const messages = await getMessages(uid, id, after);
  const latest = messages.length ? messages[messages.length - 1].ts : after;
  if (latest) await markRead(uid, id, latest);
  const [theirRead, typing, meets] = await Promise.all([readMarker(id, uid), isTyping(id, uid), meetStatuses(uid, id)]);
  return ok({ messages, theirRead, typing, meets });
});

export const POST = withUser(async (uid, req, ctx: Ctx) => {
  const { id } = await ctx.params;
  if (!(await canChat(uid, id))) return fail("You can chat once an interest is accepted.", 403);
  const body = await readJson(req);
  if ((await kv().incr(`rl:chat:${uid}`, 60)) > 60) return fail("You're sending messages too fast. Wait a minute.", 429);
  if (body.kind === "meet") {
    const m = (body.meet ?? {}) as Record<string, unknown>;
    const when = new Date(String(m.when ?? ""));
    const mode = String(m.mode ?? "") as MeetMode;
    if (Number.isNaN(when.getTime()) || when.getTime() < Date.now() - 60_000) return fail("Pick a date and time in the future.");
    if (!MEET_MODES.includes(mode)) return fail("Choose how you'd like to meet.");
    const place = typeof m.place === "string" ? m.place.trim().slice(0, 120) || undefined : undefined;
    const message = await sendMeet(uid, id, { when: when.toISOString(), mode, place });
    return ok({ message });
  }
  const text = String(body.text ?? "").trim().slice(0, 2000);
  if (!text) return fail("Type a message first.");
  const message = await sendMessage(uid, id, text);
  return ok({ message });
});
