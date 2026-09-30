import { cleanBiodataInput, getBiodata, publishProblems, saveBiodata } from "@/lib/data";
import { fail, ok, readJson, withUser } from "@/lib/api";

export const PUT = withUser(async (uid, req) => {
  const body = await readJson(req);
  const current = await getBiodata(uid);
  if (!current) return fail("Biodata not found.", 404);
  const fields = cleanBiodataInput((body.fields as Record<string, unknown>) ?? {});
  const wantPublished = typeof body.published === "boolean" ? body.published : current.published;
  if (wantPublished && current.adminHidden) {
    await saveBiodata(uid, { ...fields, published: false });
    return fail("Saved. Our team has hidden your biodata for review, so it can't be published right now.", 403);
  }
  const merged = { ...current, ...fields, published: wantPublished };
  const missing = publishProblems(merged);
  if (wantPublished && missing.length) {
    await saveBiodata(uid, { ...fields, published: false });
    return fail(`Saved. To publish, add ${missing.join(", ")}.`, 422);
  }
  const saved = await saveBiodata(uid, { ...fields, published: wantPublished });
  return ok({ ok: true, published: saved.published, updatedAt: saved.updatedAt });
});
