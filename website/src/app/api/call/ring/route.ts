import { incomingCall } from "@/lib/calls";
import { ok, withUser } from "@/lib/api";

export const dynamic = "force-dynamic";

export const GET = withUser(async (uid) => ok({ call: await incomingCall(uid) }));
