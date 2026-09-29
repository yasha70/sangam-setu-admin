import type { Metadata } from "next";
import Link from "next/link";
import { BiodataView } from "@/components/BiodataView";
import { Icon } from "@/components/Icon";
import { PdfButton } from "@/components/PdfButton";
import { requireUser } from "@/lib/auth";
import { completeness, getBiodata, publishProblems } from "@/lib/data";

export const metadata: Metadata = { title: "My biodata" };

export default async function MyBiodataPage() {
  const user = await requireUser("/biodata");
  const bio = await getBiodata(user.id);
  if (!bio) return <main className="wrap page"><p className="error">Biodata not found.</p></main>;
  const missing = publishProblems(bio);
  const pct = completeness(bio);

  return (
    <main className="wrap page stack">
      <div className="page-head">
        <div>
          <h1>My biodata</h1>
          <p>This is how families see your profile. Your address and contact details stay private.</p>
        </div>
        <div className="actions">
          <Link className="btn btn-ghost" href="/biodata/edit">
            <Icon name="edit" />
            Edit biodata
          </Link>
          <PdfButton isSelf />
        </div>
      </div>

      {bio.published ? (
        <p className="notice ok">
          <Icon name="check" />
          <span>Your biodata is published and visible to families. It&apos;s {pct}% complete.</span>
        </p>
      ) : (
        <p className="notice">
          <Icon name="info" />
          <span>
            Your biodata isn&apos;t published yet, so nobody else can see it.{" "}
            {missing.length ? <>Add {missing.join(", ")}, then </> : null}
            <Link href="/biodata/edit" style={{ color: "var(--gold-2)", fontWeight: 700 }}>switch on Publish</Link>.
          </span>
        </p>
      )}

      <BiodataView bio={bio} canSeeContact isSelf />
    </main>
  );
}
