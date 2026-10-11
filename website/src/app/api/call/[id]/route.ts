import { pullSignals, pushSignal, updateCall } from "@/lib/calls";
import { fail, ok, readJson, withUser } from "@/lib/api";

export const dynamic = "force-dynamic";
type Ctx = { params: Promise<{ id: string }> };

export const GET = withUser(async (uid, req, ctx: Ctx) => {
  const { id } = await ctx.params;
  const after = Number(new URL(req.url).searchParams.get("after") ?? 0) || 0;
  const res = await pullSignals(uid, id, after);
  return res ? ok(res) : fail("Call not found.", 404);
});

export const POST = withUser(async (uid, req, ctx: Ctx) => {
  const { id } = await ctx.params;
  const body = await readJson(req);
  if (body.action === "signal") {
    const raw = JSON.stringify(body.data ?? null);
    if (raw.length > 20_000) return fail("Signal too large.", 413);
    return (await pushSignal(uid, id, body.data)) ? ok() : fail("This call has ended.", 410);
  }
  if (body.action === "accept" || body.action === "decline" || body.action === "end") {
    const call = await updateCall(uid, id, body.action);
    return call ? ok({ call }) : fail("Call not found.", 404);
  }
  return fail("Unknown action.");
});
