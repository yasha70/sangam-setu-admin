import type { Metadata } from "next";
import Link from "next/link";
import { ClearCompare } from "@/components/Compare";
import { VoteSummary } from "@/components/Family";
import { Icon, VerifiedTick } from "@/components/Icon";
import { Ring } from "@/components/Insights";
import { EmptyState, PhotoOrLock } from "@/components/ProfileCard";
import { gunaBetween } from "@/lib/astro";
import { requireUser } from "@/lib/auth";
import { ageFrom } from "@/lib/bio";
import { forList, getBiodata, getBiodatas, hiddenFor, interestsFor, kvFamilyVotes, photosVisible, privateNotes } from "@/lib/data";
import { matchFor } from "@/lib/match";
import type { Biodata } from "@/lib/types";

export const metadata: Metadata = { title: "Compare profiles" };

const ROWS: [string, (b: Biodata) => string | undefined][] = [
  ["Age", (b) => (ageFrom(b.dob) !== null ? `${ageFrom(b.dob)} years` : undefined)],
  ["Height", (b) => b.height?.replace(/\s*\(.*\)$/, "")],
  ["Lives in", (b) => [b.city, b.state].filter(Boolean).join(", ") || undefined],
  ["Education", (b) => b.education],
  ["Occupation", (b) => [b.occupation, b.employer].filter(Boolean).join(", ") || undefined],
  ["Annual income", (b) => b.income],
  ["Religion", (b) => b.religion],
  ["Community", (b) => [b.community, b.caste].filter(Boolean).filter((x, n, a) => a.indexOf(x) === n).join(", ") || undefined],
  ["Mother tongue", (b) => b.motherTongue],
  ["Diet", (b) => b.diet],
  ["Marital status", (b) => b.maritalStatus],
  ["Manglik", (b) => b.manglik],
  ["Nakshatra", (b) => b.nakshatra],
  ["Family type", (b) => b.familyType],
  ["Native place", (b) => b.nativePlace],
];

export default async function ComparePage({ searchParams }: { searchParams: Promise<{ ids?: string }> }) {
  const user = await requireUser("/compare");
  const { ids: raw } = await searchParams;
  const hidden = await hiddenFor(user.id);
  const ids = [...new Set((raw ?? "").split(",").map((s) => s.trim()).filter(Boolean))].filter((i) => i !== user.id && !hidden.has(i)).slice(0, 3);
  const [me, bios, rels, notes, votes] = await Promise.all([
    getBiodata(user.id),
    getBiodatas(ids),
    interestsFor(user.id, ids),
    privateNotes(user.id, ids),
    kvFamilyVotes(user.id, ids),
  ]);
  const list = bios
    .map((b, i) => ({ b, id: ids[i] }))
    .filter((x): x is { b: Biodata; id: string } => Boolean(x.b && (x.b.published || rels.get(x.id)?.mine?.status === "accepted" || rels.get(x.id)?.theirs?.status === "accepted")));

  if (list.length < 2) {
    return (
      <main className="wrap page narrow">
        <div className="page-head"><div><h1>Compare profiles</h1></div></div>
        <EmptyState
          icon="scale"
          title="Pick two or three profiles"
          text="Open any profile and tap Compare. Your picks collect in a small tray at the bottom of the screen."
          action={<Link className="btn btn-brand btn-sm" href="/interests?tab=saved">Open your shortlist</Link>}
        />
      </main>
    );
  }

  const cols = list.map(({ b, id }) => {
    const r = rels.get(id);
    const shown = forList(b, photosVisible(b, r?.theirs, r?.mine));
    return {
      id,
      bio: shown,
      match: me ? matchFor(me, b).score : null,
      guna: me ? gunaBetween(me, b).result?.total ?? null : null,
      note: notes.get(id) ?? "",
      votes: votes.get(id) ?? [],
    };
  });

  return (
    <main className="wrap page">
      <div className="page-head">
        <div>
          <h1>Compare profiles</h1>
          <p>Side by side, the way families weigh a rishta. Green marks the best value in a row where it&apos;s clear.</p>
        </div>
      </div>
      <div className="compare-wrap">
        <table className="compare" style={{ ["--cols" as string]: cols.length }}>
          <thead>
            <tr>
              <th scope="col"><span className="sr-only">Detail</span></th>
              {cols.map((c) => (
                <th key={c.id} scope="col">
                  <Link href={`/profile/${c.id}`} className="cmp-head">
                    <span className="cmp-photo"><PhotoOrLock bio={c.bio} /></span>
                    <b>{c.bio.fullName}{c.bio.verified ? <VerifiedTick /> : null}</b>
                  </Link>
                  <ClearCompare id={c.id} />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr className="cmp-scores">
              <th scope="row">Match</th>
              {cols.map((c) => (
                <td key={c.id} data-best={c.match !== null && c.match === Math.max(...cols.map((x) => x.match ?? -1)) ? "true" : undefined}>
                  {c.match !== null ? <Ring value={c.match} size={54} /> : "—"}
                </td>
              ))}
            </tr>
            <tr className="cmp-scores">
              <th scope="row">Guna Milan</th>
              {cols.map((c) => (
                <td key={c.id} data-best={c.guna !== null && c.guna === Math.max(...cols.map((x) => x.guna ?? -1)) ? "true" : undefined}>
                  {c.guna !== null ? <Ring value={c.guna} max={36} size={54} tone={c.guna >= 25 ? "green" : c.guna >= 18 ? "gold" : "muted"} /> : <span className="muted small">Needs nakshatra</span>}
                </td>
              ))}
            </tr>
            {ROWS.map(([label, get]) => {
              const vals = cols.map((c) => get(c.bio));
              if (vals.every((v) => !v)) return null;
              return (
                <tr key={label}>
                  <th scope="row">{label}</th>
                  {vals.map((v, i) => (
                    <td key={cols[i].id}>{v || <span className="muted">—</span>}</td>
                  ))}
                </tr>
              );
            })}
            <tr>
              <th scope="row">Family says</th>
              {cols.map((c) => (
                <td key={c.id}><VoteSummary votes={c.votes} /></td>
              ))}
            </tr>
            <tr>
              <th scope="row">Your note</th>
              {cols.map((c) => (
                <td key={c.id} className="cmp-note">{c.note || <span className="muted small">No note yet</span>}</td>
              ))}
            </tr>
            <tr>
              <th scope="row"><span className="sr-only">Open</span></th>
              {cols.map((c) => (
                <td key={c.id}>
                  <Link className="btn btn-ghost btn-sm" href={`/profile/${c.id}`}>
                    Full biodata
                    <Icon name="chevron" />
                  </Link>
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </main>
  );
}
