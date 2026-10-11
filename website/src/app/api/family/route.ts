import { createFamilyLink, revokeFamilyLink } from "@/lib/data";
import { fail, ok, readJson, withUser } from "@/lib/api";

export const POST = withUser(async (uid, req) => {
  const body = await readJson(req);
  if (body.action === "create") return ok(await createFamilyLink(uid));
  if (body.action === "revoke") {
    await revokeFamilyLink(uid);
    return ok();
  }
  return fail("Unknown action.");
});
