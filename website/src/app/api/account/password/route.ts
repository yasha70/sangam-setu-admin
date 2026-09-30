import { getUser, saveUser } from "@/lib/data";
import { hashPassword, verifyPassword } from "@/lib/auth";
import { fail, ok, readJson, withUser } from "@/lib/api";

export const POST = withUser(async (uid, req) => {
  const { current, next } = await readJson(req);
  const user = await getUser(uid);
  if (!user) return fail("Account not found.", 404);
  if (!(await verifyPassword(String(current ?? ""), user.passHash))) return fail("Your current password is wrong.", 401);
  if (String(next ?? "").length < 6) return fail("Use a new password of at least 6 characters.");
  await saveUser({ ...user, passHash: await hashPassword(String(next)) });
  return ok({ message: "Password changed." });
});
