import type { Metadata } from "next";
import Link from "next/link";
import { BiodataView } from "@/components/BiodataView";
import { Icon, Silhouette } from "@/components/Icon";
import { PdfButton } from "@/components/PdfButton";
import { requireUser } from "@/lib/auth";
import { ageFrom } from "@/lib/bio";
import { completeness, getBiodata, getBiodatas, publishProblems, viewsFor } from "@/lib/data";

export const metadata: Metadata = { title: "My biodata" };

export default async function MyBiodataPage() {
  const user = await requireUser("/biodata");
  const bio = await getBiodata(user.id);
  if (!bio) return <main className="wrap page"><p className="error">Biodata not found.</p></main>;
  const views = await viewsFor(user.id);
  const viewers = (await getBiodatas(views.recent)).filter((b) => b && (b.published || b.sample));
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
          <Link className="btn btn-quiet" href="/account">Account</Link>
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

      <section className="card">
        <div className="card-head">
          <h2>Who viewed your profile</h2>
          <p>{views.count} {views.count === 1 ? "view" : "views"} in total</p>
        </div>
        {viewers.length ? (
          <div className="list">
            {viewers.map((b) => {
              const age = ageFrom(b!.dob);
              return (
                <Link key={b!.userId} className="list-row" href={`/profile/${b!.userId}`} style={{ textDecoration: "none", boxShadow: "none" }}>
                  <span className="avatar sm">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {b!.photos[0] ? <img src={b!.photos[0]} alt="" /> : <Silhouette />}
                  </span>
                  <span className="who">
                    <b>{b!.fullName}</b>
                    <span>{[age !== null ? `${age} yrs` : null, b!.city, b!.occupation].filter(Boolean).join(" · ")}</span>
                  </span>
                </Link>
              );
            })}
          </div>
        ) : (
          <p className="muted small">Nobody has opened your profile yet. A complete biodata with a clear photo gets more views.</p>
        )}
      </section>

      <BiodataView bio={bio} canSeeContact isSelf />
    </main>
  );
}
