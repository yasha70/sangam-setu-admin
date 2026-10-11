import { put } from "@vercel/blob";
import { canChat, chatId, messageById, newId, previewText, sendMessage } from "@/lib/data";
import { fail, ok, withUser } from "@/lib/api";
import { kv } from "@/lib/kv";

type Ctx = { params: Promise<{ id: string }> };

const IMAGE: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
const AUDIO: Record<string, string> = { "audio/webm": "webm", "audio/ogg": "ogg", "audio/mp4": "m4a", "audio/mpeg": "mp3", "audio/aac": "aac", "audio/x-m4a": "m4a" };

/** Photos and voice notes in chat. Stored in Vercel Blob under an unguessable name; inline in local development. */
export const POST = withUser(async (uid, req, ctx: Ctx) => {
  const { id } = await ctx.params;
  if (!(await canChat(uid, id))) return fail("You can chat once an interest is accepted.", 403);
  if ((await kv().incr(`rl:media:${uid}`, 3600)) > 60) return fail("That's a lot of photos and voice notes for one hour. Try again later.", 429);
  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  const kind = form?.get("kind") === "voice" ? "voice" : "image";
  if (!(file instanceof File)) return fail("Choose a file to send.");
  const type = file.type.split(";")[0];
  const ext = kind === "image" ? IMAGE[type] : AUDIO[type];
  if (!ext) return fail(kind === "image" ? "Send a JPG, PNG or WebP photo." : "This voice note format isn't supported.");
  const max = kind === "image" ? 5 * 1024 * 1024 : 3 * 1024 * 1024;
  if (file.size > max) return fail(kind === "image" ? "That photo is too large." : "That voice note is too long.");
  const dur = Math.min(180, Math.max(0, Math.round(Number(form?.get("dur") ?? 0)))) || undefined;
  const caption = String(form?.get("caption") ?? "").trim().slice(0, 500);

  let url: string;
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const blob = await put(`chat/${chatId(uid, id)}/${newId()}.${ext}`, file, { access: "public", contentType: type, addRandomSuffix: true });
    url = blob.url;
  } else if (process.env.NODE_ENV !== "production" || process.env.SANGAM_MEMORY_DB === "1") {
    url = `data:${type};base64,${Buffer.from(await file.arrayBuffer()).toString("base64")}`;
  } else {
    return fail("File storage isn't connected yet.", 503);
  }
  let reply;
  const replyTo = form?.get("replyTo");
  if (typeof replyTo === "string" && replyTo) {
    const target = await messageById(uid, id, replyTo);
    if (target && target.kind !== "deleted") reply = { id: target.id, from: target.from, text: previewText(target).slice(0, 140) };
  }
  const message = await sendMessage(uid, id, caption, { kind, media: { url, dur }, ...(reply ? { reply } : {}) });
  return ok({ message });
});
