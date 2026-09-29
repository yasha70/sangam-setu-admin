import { getBiodata, respondInterest, sendInterest, withdrawInterest } from "@/lib/data";
import { fail, ok, readJson, withUser } from "@/lib/api";

export const POST = withUser(async (uid, req) => {
  const body = await readJson(req);
  const other = String(body.id ?? "");
  const action = String(body.action ?? "");
  if (!other || other === uid) return fail("Choose a profile.");

  if (action === "send") {
    const [mine, theirs] = await Promise.all([getBiodata(uid), getBiodata(other)]);
    if (!theirs?.published) return fail("This profile isn't available.", 404);
    if (theirs.sample) return fail("This is a sample profile, so it can't receive interests.", 422);
    if (!mine?.published) return fail("Publish your own biodata first, so they can see who's interested.", 422);
    const result = await sendInterest(uid, other);
    if (result === "blocked") return fail("You can't send an interest to this profile.", 403);
    return ok({ ok: true, result });
  }
  if (action === "accept" || action === "decline") {
    const done = await respondInterest(uid, other, action === "accept");
    return done ? ok({ ok: true, result: action === "accept" ? "connected" : "declined" }) : fail("This interest is no longer pending.", 409);
  }
  if (action === "withdraw") {
    const done = await withdrawInterest(uid, other);
    return done ? ok({ ok: true, result: "withdrawn" }) : fail("Only pending interests can be withdrawn.", 409);
  }
  return fail("Unknown action.");
});
