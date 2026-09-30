import { findUserIdByPhone, getUser } from "@/lib/data";
import { normalizePhone, startSession, verifyPassword } from "@/lib/auth";
import { errorResponse, fail, ok, readJson } from "@/lib/api";
import { kv } from "@/lib/kv";

export async function POST(req: Request) {
  try {
    const body = await readJson(req);
    const phone = normalizePhone(String(body.phone ?? ""));
    const password = String(body.password ?? "");
    if (!phone || !password) return fail("Enter your mobile number and password.");

    const attempts = await kv().incr(`rl:login:${phone}`, 900);
    if (attempts > 10) return fail("Too many attempts. Wait 15 minutes and try again.", 429);

    const id = await findUserIdByPhone(phone);
    const user = id ? await getUser(id) : null;
    if (!user || !(await verifyPassword(password, user.passHash))) {
      return fail("That mobile number and password don't match.", 401);
    }
    if (user.status === "suspended") {
      return fail("This account has been suspended. Contact Sangam Setu support if you think this is a mistake.", 403);
    }
    await kv().del(`rl:login:${phone}`);
    await startSession(user.id);
    return ok({ ok: true });
  } catch (e) {
    return errorResponse(e);
  }
}
