import type { Metadata } from "next";
import Link from "next/link";
import { BrowseFilters, type Filters } from "@/components/BrowseFilters";
import { EmptyState, ProfileCard } from "@/components/ProfileCard";
import { Icon } from "@/components/Icon";
import { requireUser } from "@/lib/auth";
import { ageFrom } from "@/lib/bio";
import { loadCandidates, rankScore, stateOf, type Candidate } from "@/lib/feed";

export const metadata: Metadata = { title: "Search" };

const has = (hay: string | undefined, needle: string) => (hay ?? "").toLowerCase().includes(needle);

const SORTS: Record<string, (a: Candidate, b: Candidate) => number> = {
  match: (a, b) => rankScore(b) - rankScore(a),
  new: (a, b) => b.bio.updatedAt - a.bio.updatedAt,
  active: (a, b) => (b.lastActive ?? 0) - (a.lastActive ?? 0),
  guna: (a, b) => (b.guna ?? -1) - (a.guna ?? -1) || rankScore(b) - rankScore(a),
};

export default async function BrowsePage({ searchParams }: { searchParams: Promise<Filters> }) {
  const user = await requireUser("/browse");
  const f = await searchParams;
  const { me, list } = await loadCandidates(user);

  const q = f.q?.trim().toLowerCase();
  const ageMin = Number(f.ageMin) || 0;
  const ageMax = Number(f.ageMax) || 200;
  const community = f.community?.trim().toLowerCase();
  const results = list.filter(({ bio: b, mutual, guna }) => {
    const age = ageFrom(b.dob) ?? 0;
    if (age < ageMin || age > ageMax) return false;
    if (f.state && b.state !== f.state) return false;
    if (f.religion && b.religion !== f.religion) return false;
    if (f.marital && b.maritalStatus !== f.marital) return false;
    if (f.diet && b.diet !== f.diet) return false;
    if (f.tongue && b.motherTongue !== f.tongue) return false;
    if (f.photo === "1" && !b.photos.length && !b.photosHidden) return false;
    if (f.verified === "1" && !b.verified) return false;
    if (f.mutual === "1" && !mutual) return false;
    if (f.guna === "1" && (guna === null || guna < 18)) return false;
    if (community && !has(b.community, community) && !has(b.caste, community) && !has(b.subCaste, community)) return false;
    if (q && ![b.fullName, b.city, b.state, b.occupation, b.employer, b.education, b.profileNo ? `ss${b.profileNo}` : ""].some((x) => has(x, q))) return false;
    return true;
  });
  const sort = f.sort && SORTS[f.sort] ? f.sort : "match";
  results.sort(SORTS[sort]);
  const shown = results.slice(0, 120);
  const online = (c: Candidate) => Boolean(c.lastActive && Date.now() - c.lastActive < 3 * 60_000);
  const qs = (patch: Record<string, string>) => {
    const p = new URLSearchParams(Object.entries({ ...f, ...patch }).filter(([, v]) => v) as [string, string][]);
    return `/browse?${p.toString()}`;
  };

  return (
    <main className="wrap page">
      <div className="page-head">
        <div>
          <h1>{user.gender === "male" ? "Brides" : "Grooms"} for you</h1>
          <p>Every profile shows how well it fits your preferences. Open one to see why, and your Guna Milan.</p>
        </div>
        <Link className="btn btn-ghost btn-sm" href="/discover">
          <Icon name="compass" />
          One at a time
        </Link>
      </div>

      {!me.published ? (
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
        <div className="stack" style={{ gap: 14 }}>
          <nav className="sortbar" aria-label="Sort">
            <span className="muted small">Sort by</span>
            {[
              ["match", "Best match"],
              ["new", "Newest"],
              ["active", "Recently active"],
              ["guna", "Guna Milan"],
            ].map(([id, label]) => (
              <Link key={id} href={qs({ sort: id })} aria-current={sort === id ? "page" : undefined}>{label}</Link>
            ))}
          </nav>
          {shown.length ? (
            <div className="cards">
              {shown.map((c) => (
                <ProfileCard key={c.bio.userId} bio={c.bio} saved={c.saved} status={stateOf(c)} match={c.match.score} mutual={c.mutual} guna={c.guna} online={online(c)} />
              ))}
            </div>
          ) : (
            <EmptyState
              title={list.length ? "No profiles match these filters" : "No profiles yet"}
              text={list.length ? "Try a wider age range or remove a filter." : "New biodatas appear here as soon as families publish them."}
              action={list.length ? <Link className="btn btn-ghost btn-sm" href="/browse">Clear filters</Link> : null}
            />
          )}
        </div>
      </div>
    </main>
  );
}
