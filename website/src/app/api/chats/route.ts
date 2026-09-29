import { chatListFor } from "@/lib/data";
import { ok, withUser } from "@/lib/api";

export const dynamic = "force-dynamic";

export const GET = withUser(async (uid) => ok({ chats: await chatListFor(uid) }));
