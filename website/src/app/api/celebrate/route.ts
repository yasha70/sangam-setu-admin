import { clearCelebration } from "@/lib/data";
import { ok, readJson, withUser } from "@/lib/api";

export const POST = withUser(async (uid, req) => {
  const body = await readJson(req);
  await clearCelebration(uid, String(body.id ?? ""));
  return ok();
});
