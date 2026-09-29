import { setSaved } from "@/lib/data";
import { fail, ok, readJson, withUser } from "@/lib/api";

export const POST = withUser(async (uid, req) => {
  const body = await readJson(req);
  const id = String(body.id ?? "");
  if (!id || id === uid) return fail("Choose a profile to save.");
  await setSaved(uid, id, body.saved !== false);
  return ok();
});
