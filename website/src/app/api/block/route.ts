import { blockUser, unblockUser } from "@/lib/data";
import { fail, ok, readJson, withUser } from "@/lib/api";

export const POST = withUser(async (uid, req) => {
  const body = await readJson(req);
  const id = String(body.id ?? "");
  if (!id || id === uid) return fail("Choose a profile.");
  if (body.blocked === false) await unblockUser(uid, id);
  else await blockUser(uid, id);
  return ok();
});
