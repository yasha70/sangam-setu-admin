import { createReport, getBiodata } from "@/lib/data";
import { fail, ok, readJson, withUser } from "@/lib/api";
import { kv } from "@/lib/kv";
import type { ReportReason } from "@/lib/types";

const REASONS: ReportReason[] = ["Fake profile", "Wrong information", "Inappropriate photo", "Abusive messages", "Asking for money", "Already married", "Other"];

export const POST = withUser(async (uid, req) => {
  const body = await readJson(req);
  const target = String(body.id ?? "");
  const reason = REASONS.find((r) => r === body.reason);
  if (!target || target === uid) return fail("Choose a profile to report.");
  if (!reason) return fail("Choose a reason.");
  const bio = await getBiodata(target);
  if (!bio || bio.sample) return fail("This profile can't be reported.", 404);
  if ((await kv().incr(`rl:report:${uid}`, 86400)) > 10) return fail("You've sent a lot of reports today. Try again tomorrow.", 429);
  await createReport({ from: uid, target, reason, note: String(body.note ?? "").trim().slice(0, 500) });
  return ok({ message: "Thanks. Our team will review this profile." });
});
