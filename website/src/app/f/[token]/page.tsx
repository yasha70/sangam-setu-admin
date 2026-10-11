import type { Metadata } from "next";
import Link from "next/link";
import { FamilyReview, type ReviewItem } from "@/components/Family";
import { Lotus } from "@/components/Icon";
import { ageFrom } from "@/lib/bio";
import { familyList, familyOwner, getBiodata } from "@/lib/data";

export const metadata: Metadata = { title: "Family review", robots: { index: false, follow: false } };

export default async function FamilyReviewPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const owner = await familyOwner(token);
  if (!owner) {
    return (
      <main className="auth">
        <div className="card stack" style={{ textAlign: "center", justifyItems: "center" }}>
          <Lotus className="big-lotus" />
          <h1>This link has expired</h1>
          <p className="muted">Family links work for two weeks. Ask for a fresh one from the Parivar panel.</p>
          <Link className="btn btn-gold" href="/">Visit Sangam Setu</Link>
        </div>
      </main>
    );
  }
  const [me, list] = await Promise.all([getBiodata(owner), familyList(owner)]);
  const ownerFirst = (me?.fullName ?? "Your family member").split(" ")[0];
  const items: ReviewItem[] = list.map(({ bio, group, votes }) => {
    const parts = (bio.fullName ?? "").trim().split(/\s+/);
    const name = parts.length > 1 ? `${parts[0]} ${parts[parts.length - 1][0]}.` : parts[0] || "Unnamed";
    return {
      id: bio.userId,
      name,
      age: ageFrom(bio.dob),
      facts: [
        bio.height?.replace(/\s*\(.*\)$/, ""),
        [bio.city, bio.state].filter(Boolean).join(", "),
        bio.occupation,
        bio.education,
        [bio.community, bio.caste].filter(Boolean).filter((x, n, a) => a.indexOf(x) === n).join(", "),
        bio.diet,
        bio.maritalStatus,
        bio.familyType,
      ].filter((x): x is string => Boolean(x)),
      about: bio.about ? (bio.about.length > 260 ? bio.about.slice(0, 257).trimEnd() + "…" : bio.about) : undefined,
      prompts: bio.prompts ?? [],
      photo: bio.photos[0] ?? null,
      photoLocked: Boolean(bio.photosHidden),
      verified: bio.verified,
      sample: bio.sample,
      group,
      votes,
    };
  });

  return (
    <main className="wrap page">
      <div className="page-head fam-head">
        <div>
          <p className="eyebrow">Family review · Sangam Setu</p>
          <h1>{ownerFirst} wants your opinion</h1>
          <p>
            These are the rishtas {ownerFirst} is considering. React to each one and add a comment if you like. {ownerFirst} sees every
            reaction. Contact details stay private.
          </p>
        </div>
      </div>
      <FamilyReview token={token} owner={ownerFirst} items={items} />
    </main>
  );
}
