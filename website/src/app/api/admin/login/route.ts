import { adminEnabled, checkAdminPassword, startAdminSession } from "@/lib/admin";
import { errorResponse, fail, ok, readJson } from "@/lib/api";
import { kv } from "@/lib/kv";

export async function POST(req: Request) {
  try {
    if (!adminEnabled()) return fail("The admin panel is switched off. Set ADMIN_PASSWORD in Vercel.", 503);
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
    if ((await kv().incr(`rl:admin:${ip}`, 900)) > 8) return fail("Too many attempts. Wait 15 minutes.", 429);
    const { password } = await readJson(req);
    if (!checkAdminPassword(String(password ?? ""))) return fail("Wrong admin password.", 401);
    await kv().del(`rl:admin:${ip}`);
    await startAdminSession();
    return ok();
  } catch (e) {
    return errorResponse(e);
  }
}
