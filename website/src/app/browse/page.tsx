import type { Metadata } from "next";
import Link from "next/link";
import { BrowseFilters, type Filters } from "@/components/BrowseFilters";
import { EmptyState, ProfileCard, type CardStatus } from "@/components/ProfileCard";
import { Icon } from "@/components/Icon";
import { requireUser } from "@/lib/auth";
import { ageFrom } from "@/lib/bio";
import { ensureSamples } from "@/lib/samples";
import { getBiodata, getBiodatas, hiddenFor, interestsFor, listPublishedIds, savedIds } from "@/lib/data";
import type { Biodata } from "@/lib/types";

export const metadata: Metadata = { title: "Browse" };

const has = (hay: string | undefined, needle: string) => (hay ?? "").toLowerCase().includes(needle);

export default async function BrowsePage({ searchParams }: { searchParams: Promise<Filters> }) {
  const user = await requireUser("/browse");
  const f = await searchParams;
  await ensureSamples();
  const [ids, hidden, saved, mine] = await Promise.all([listPublishedIds(), hiddenFor(user.id), savedIds(user.id), getBiodata(user.id)]);
  const bios = (await getBiodatas(ids.filter((i) => i !== user.id && !hidden.has(i)))).filter(
    (b): b is Biodata => Boolean(b?.published),
  );

  const q = f.q?.trim().toLowerCase();
  const ageMin = Number(f.ageMin) || 0;
  const ageMax = Number(f.ageMax) || 200;
  const community = f.community?.trim().toLowerCase();
  const results = bios.filter((b) => {
    if (b.gender === user.gender) return false;
    const age = ageFrom(b.dob) ?? 0;
    if (age < ageMin || age > ageMax) return false;
    if (f.state && b.state !== f.state) return false;
    if (f.religion && b.religion !== f.religion) return false;
    if (f.marital && b.maritalStatus !== f.marital) return false;
    if (f.photo === "1" && !b.photos.length) return false;
    if (f.verified === "1" && !b.verified) return false;
    if (community && !has(b.community, community) && !has(b.caste, community) && !has(b.subCaste, community)) return false;
    if (q && ![b.fullName, b.city, b.state, b.occupation, b.employer, b.education, b.profileNo ? `ss${b.profileNo}` : ""].some((x) => has(x, q))) return false;
    return true;
  });

  const shown = results.slice(0, 120);
  const rels = await interestsFor(user.id, shown.map((b) => b.userId));
  const savedSet = new Set(saved);
  const statusOf = (id: string): CardStatus => {
    const r = rels.get(id);
    if (!r) return "none";
    if (r.mine?.status === "accepted" || r.theirs?.status === "accepted") return "connected";
    if (r.theirs?.status === "pending") return "received";
    if (r.mine?.status === "pending") return "sent";
    if (r.mine?.status === "declined") return "declined";
    return "none";
  };

  return (
    <main className="wrap page">
      <div className="page-head">
        <div>
          <h1>{user.gender === "male" ? "Brides" : "Grooms"} for you</h1>
          <p>Send an interest to the profiles you like. When they accept, you can chat and see their contact details.</p>
        </div>
      </div>

      {!mine?.published ? (
        <p className="notice" style={{ marginBottom: 18 }}>
          <Icon name="info" />
          <span>
            Your own biodata isn&apos;t published yet. Families can&apos;t see you, and you can&apos;t send interests until it is.{" "}
            <Link href="/biodata/edit" style={{ color: "var(--gold-2)", fontWeight: 700 }}>Complete your biodata</Link>
          </span>
        </p>
      ) : null}

      <div className="browse">
        <BrowseFilters f={f} count={results.length} />
        {shown.length ? (
          <div className="cards">
            {shown.map((b) => (
              <ProfileCard key={b.userId} bio={b} saved={savedSet.has(b.userId)} status={statusOf(b.userId)} />
            ))}
          </div>
        ) : (
          <EmptyState
            title={bios.length ? "No profiles match these filters" : "No profiles yet"}
            text={bios.length ? "Try a wider age range or remove a filter." : "New biodatas appear here as soon as families publish them."}
            action={bios.length ? <Link className="btn btn-ghost btn-sm" href="/browse">Clear filters</Link> : null}
          />
        )}
      </div>
    </main>
  );
}
