import { pendingReceivedCount, unreadTotal } from "@/lib/data";
import { ok, withUser } from "@/lib/api";

export const dynamic = "force-dynamic";

export const GET = withUser(async (uid) => {
  const [interests, messages] = await Promise.all([pendingReceivedCount(uid), unreadTotal(uid)]);
  return ok({ interests, messages });
});
