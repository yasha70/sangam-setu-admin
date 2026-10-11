import { cleanBiodataInput, cleanPrefs, cleanPrompts, getBiodata, publishProblems, saveBiodata, scrubBiodata } from "@/lib/data";
import { NextResponse } from "next/server";
import type { Biodata } from "@/lib/types";
import { fail, ok, readJson, withUser } from "@/lib/api";

export const PUT = withUser(async (uid, req) => {
  const body = await readJson(req);
  const current = await getBiodata(uid);
  if (!current) return fail("Biodata not found.", 404);
  const raw: Partial<Biodata> = cleanBiodataInput((body.fields as Record<string, unknown>) ?? {});
  if ("prompts" in body) raw.prompts = cleanPrompts(body.prompts);
  // Phone numbers and emails in free text are hidden; contact details belong in the Contact person section.
  const { fields, hidden } = await scrubBiodata(uid, raw);
  if ("prefs" in body) fields.prefs = cleanPrefs(body.prefs);
  const cleaned = { fields: Object.fromEntries(Object.entries(fields).filter(([k]) => k !== "prefs")), hidden };
  if (body.photoPrivacy === "all" || body.photoPrivacy === "interest") fields.photoPrivacy = body.photoPrivacy;
  if (typeof body.familyShare === "boolean") fields.familyShare = body.familyShare;
  const wantPublished = typeof body.published === "boolean" ? body.published : current.published;
  if (wantPublished && current.adminHidden) {
    await saveBiodata(uid, { ...fields, published: false });
    return NextResponse.json({ error: "Saved. Our team has hidden your biodata for review, so it can't be published right now.", ...cleaned }, { status: 403 });
  }
  const merged = { ...current, ...fields, published: wantPublished };
  const missing = publishProblems(merged);
  if (wantPublished && missing.length) {
    await saveBiodata(uid, { ...fields, published: false });
    return NextResponse.json({ error: `Saved. To publish, add ${missing.join(", ")}.`, ...cleaned }, { status: 422 });
  }
  const saved = await saveBiodata(uid, { ...fields, published: wantPublished });
  return ok({ ok: true, published: saved.published, updatedAt: saved.updatedAt, ...cleaned });
});
