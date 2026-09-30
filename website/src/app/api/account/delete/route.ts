import { del } from "@vercel/blob";
import { deleteAccount, getUser } from "@/lib/data";
import { endSession, verifyPassword } from "@/lib/auth";
import { fail, ok, readJson, withUser } from "@/lib/api";

export const POST = withUser(async (uid, req) => {
  const { password } = await readJson(req);
  const user = await getUser(uid);
  if (!user) return fail("Account not found.", 404);
  if (!(await verifyPassword(String(password ?? ""), user.passHash))) return fail("That password is wrong.", 401);
  const { bio } = await deleteAccount(uid);
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const blobs = (bio?.photos ?? []).filter((p) => p.includes(`/photos/${uid}/`));
    if (blobs.length) await del(blobs).catch(() => undefined);
  }
  await endSession();
  return ok({ message: "Your account has been deleted." });
});
