import { pendingCelebration, pendingReceivedCount, unreadTotal, unseenNoticeCount } from "@/lib/data";
import { ok, withUser } from "@/lib/api";

export const dynamic = "force-dynamic";

export const GET = withUser(async (uid) => {
  const [interests, messages, notices, celebrate] = await Promise.all([
    pendingReceivedCount(uid),
    unreadTotal(uid),
    unseenNoticeCount(uid),
    pendingCelebration(uid),
  ]);
  return ok({ interests, messages, notices, celebrate });
});
