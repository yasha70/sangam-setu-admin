import { endAdminSession } from "@/lib/admin";
import { ok } from "@/lib/api";

export async function POST() {
  await endAdminSession();
  return ok();
}
