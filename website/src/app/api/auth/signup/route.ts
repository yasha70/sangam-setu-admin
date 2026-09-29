import { createUser } from "@/lib/data";
import { hashPassword, normalizePhone, startSession } from "@/lib/auth";
import { errorResponse, fail, ok, readJson } from "@/lib/api";
import { kv } from "@/lib/kv";
import { CREATED_FOR } from "@/lib/options";
import type { Gender } from "@/lib/types";

export async function POST(req: Request) {
  try {
    const body = await readJson(req);
    const name = String(body.name ?? "").trim().slice(0, 80);
    const phone = normalizePhone(String(body.phone ?? ""));
    const password = String(body.password ?? "");
    const gender = body.gender === "male" || body.gender === "female" ? (body.gender as Gender) : null;
    const createdFor = CREATED_FOR.includes(body.createdFor as never) ? String(body.createdFor) : "Myself";

    if (name.length < 2) return fail("Enter the full name of the person getting married.");
    if (!gender) return fail("Choose whether the profile is for a bride or a groom.");
    if (!phone) return fail("Enter a valid 10-digit Indian mobile number.");
    if (password.length < 6) return fail("Use a password of at least 6 characters.");

    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
    if ((await kv().incr(`rl:signup:${ip}`, 3600)) > 20) return fail("Too many sign-ups from this network. Try again in an hour.", 429);

    const user = await createUser({ name, phone, gender, createdFor, passHash: await hashPassword(password) });
    if (!user) return fail("This mobile number already has an account. Log in instead.", 409);
    await startSession(user.id);
    return ok({ ok: true });
  } catch (e) {
    return errorResponse(e);
  }
}
