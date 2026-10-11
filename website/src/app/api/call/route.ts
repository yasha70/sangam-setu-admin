import { canChat } from "@/lib/data";
import { iceServers, startCall } from "@/lib/calls";
import { fail, ok, readJson, withUser } from "@/lib/api";
import { kv } from "@/lib/kv";

export const dynamic = "force-dynamic";

export const GET = withUser(async () => ok({ iceServers: iceServers() }));

export const POST = withUser(async (uid, req) => {
  const body = await readJson(req);
  const to = String(body.to ?? "");
  if (!(await canChat(uid, to))) return fail("You can call once an interest is accepted.", 403);
  if ((await kv().incr(`rl:call:${uid}`, 600)) > 15) return fail("Too many calls in a few minutes. Try again shortly.", 429);
  const res = await startCall(uid, to, Boolean(body.video));
  if ("error" in res) return fail(res.error!, 409);
  return ok({ call: res.call, iceServers: iceServers() });
});
