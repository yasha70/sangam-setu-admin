import { renderToBuffer } from "@react-pdf/renderer";
import { BiodataPdf } from "@/lib/pdf/BiodataPdf";
import { ageFrom, biodataForViewer, getBiodata, relationBetween } from "@/lib/data";
import { fail, withUser } from "@/lib/api";
import { PDF_TEMPLATES, type PdfTemplateId } from "@/lib/options";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

export const GET = withUser(async (uid, req) => {
  const url = new URL(req.url);
  const id = url.searchParams.get("id") || uid;
  const template = (PDF_TEMPLATES.find((t) => t.id === url.searchParams.get("t"))?.id ?? "royal") as PdfTemplateId;

  const relation = await relationBetween(uid, id);
  if (relation.kind !== "self" && relation.kind !== "connected") {
    return fail("You can download a biodata once your interest is accepted.", 403);
  }
  const full = await getBiodata(id);
  if (!full) return fail("Biodata not found.", 404);
  const bio = biodataForViewer(full, relation);

  const isOwner = relation.kind === "self";
  const includeContact = url.searchParams.get("contact") !== "0";
  const includeAddress = isOwner && url.searchParams.get("address") === "1";

  const buffer = await renderToBuffer(
    <BiodataPdf
      bio={bio}
      opts={{ template, includeContact, includeAddress, age: ageFrom(bio.dob), siteUrl: url.host }}
    />,
  );

  const safeName = (bio.fullName || "Biodata").replace(/[^\w\s-]/g, "").trim().replace(/\s+/g, "-") || "Biodata";
  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${url.searchParams.get("view") === "1" ? "inline" : "attachment"}; filename="${safeName}-Biodata.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
});
