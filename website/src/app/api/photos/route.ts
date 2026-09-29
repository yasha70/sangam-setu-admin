import { put, del } from "@vercel/blob";
import { getBiodata, newId, saveBiodata } from "@/lib/data";
import { fail, ok, readJson, withUser } from "@/lib/api";

const MAX_PHOTOS = 4;
const MAX_BYTES = 4 * 1024 * 1024;
const TYPES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

const blobEnabled = () => Boolean(process.env.BLOB_READ_WRITE_TOKEN);

export const POST = withUser(async (uid, req) => {
  const bio = await getBiodata(uid);
  if (!bio) return fail("Biodata not found.", 404);
  if (bio.photos.length >= MAX_PHOTOS) return fail(`You can add up to ${MAX_PHOTOS} photos. Remove one first.`);

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return fail("Choose a photo to upload.");
  const ext = TYPES[file.type];
  if (!ext) return fail("Use a JPG, PNG or WebP photo.");
  if (file.size > MAX_BYTES) return fail("That photo is too large. Use one under 4 MB.");

  let url: string;
  if (blobEnabled()) {
    const blob = await put(`photos/${uid}/${newId()}.${ext}`, file, {
      access: "public",
      contentType: file.type,
      addRandomSuffix: false,
      cacheControlMaxAge: 60 * 60 * 24 * 365,
    });
    url = blob.url;
  } else if (process.env.NODE_ENV !== "production" || process.env.SANGAM_MEMORY_DB === "1") {
    // Local development without Blob storage: keep the photo inline.
    url = `data:${file.type};base64,${Buffer.from(await file.arrayBuffer()).toString("base64")}`;
  } else {
    return fail("Photo storage isn't connected yet.", 503);
  }

  const saved = await saveBiodata(uid, { photos: [...bio.photos, url] });
  return ok({ photos: saved.photos });
});

export const PATCH = withUser(async (uid, req) => {
  const { url } = await readJson(req);
  const bio = await getBiodata(uid);
  if (!bio || typeof url !== "string" || !bio.photos.includes(url)) return fail("Photo not found.", 404);
  const saved = await saveBiodata(uid, { photos: [url, ...bio.photos.filter((p) => p !== url)] });
  return ok({ photos: saved.photos });
});

export const DELETE = withUser(async (uid, req) => {
  const { url } = await readJson(req);
  const bio = await getBiodata(uid);
  if (!bio || typeof url !== "string" || !bio.photos.includes(url)) return fail("Photo not found.", 404);
  const saved = await saveBiodata(uid, { photos: bio.photos.filter((p) => p !== url) });
  if (blobEnabled() && url.includes(`/photos/${uid}/`)) {
    await del(url).catch(() => undefined);
  }
  return ok({ photos: saved.photos, published: saved.published });
});
