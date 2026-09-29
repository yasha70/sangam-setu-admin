import { canChat, getMessages, markRead, readMarker, sendMessage } from "@/lib/data";
import { fail, ok, readJson, withUser } from "@/lib/api";
import { kv } from "@/lib/kv";

export const dynamic = "force-dynamic";
type Ctx = { params: Promise<{ id: string }> };

export const GET = withUser(async (uid, req, ctx: Ctx) => {
  const { id } = await ctx.params;
  if (!(await canChat(uid, id))) return fail("You can chat once an interest is accepted.", 403);
  const after = Number(new URL(req.url).searchParams.get("after") ?? 0) || 0;
  const messages = await getMessages(uid, id, after);
  const latest = messages.length ? messages[messages.length - 1].ts : after;
  if (latest) await markRead(uid, id, latest);
  const theirRead = await readMarker(id, uid);
  return ok({ messages, theirRead });
});

export const POST = withUser(async (uid, req, ctx: Ctx) => {
  const { id } = await ctx.params;
  if (!(await canChat(uid, id))) return fail("You can chat once an interest is accepted.", 403);
  const body = await readJson(req);
  const text = String(body.text ?? "").trim().slice(0, 2000);
  if (!text) return fail("Type a message first.");
  if ((await kv().incr(`rl:chat:${uid}`, 60)) > 60) return fail("You're sending messages too fast. Wait a minute.", 429);
  const message = await sendMessage(uid, id, text);
  return ok({ message });
});
