import { listNotices, markNoticesSeen, noticesSeenAt } from "@/lib/data";
import { ok, withUser } from "@/lib/api";

export const dynamic = "force-dynamic";

export const GET = withUser(async (uid) => {
  const [notices, seenAt] = await Promise.all([listNotices(uid), noticesSeenAt(uid)]);
  return ok({ notices, seenAt });
});

export const POST = withUser(async (uid) => {
  await markNoticesSeen(uid);
  return ok();
});
