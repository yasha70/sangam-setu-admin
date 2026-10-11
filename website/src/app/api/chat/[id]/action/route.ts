import { del } from "@vercel/blob";
import { canChat, deleteMessage, reactToMessage } from "@/lib/data";
import { fail, ok, readJson, withUser } from "@/lib/api";
import { REACTIONS } from "@/lib/types";

type Ctx = { params: Promise<{ id: string }> };

export const POST = withUser(async (uid, req, ctx: Ctx) => {
  const { id } = await ctx.params;
  if (!(await canChat(uid, id))) return fail("Chat not open.", 403);
  const body = await readJson(req);
  const mid = String(body.mid ?? "");
  if (body.action === "react") {
    const emoji = typeof body.emoji === "string" && (REACTIONS as readonly string[]).includes(body.emoji) ? body.emoji : null;
    const meta = await reactToMessage(uid, id, mid, emoji);
    return meta ? ok({ meta }) : fail("Message not found.", 404);
  }
  if (body.action === "delete") {
    const res = await deleteMessage(uid, id, mid);
    if ("error" in res) return fail(res.error!, 409);
    if (res.media?.startsWith("https://") && process.env.BLOB_READ_WRITE_TOKEN) await del(res.media).catch(() => undefined);
    return ok({ message: res.message });
  }
  return fail("Unknown action.");
});
