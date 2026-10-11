import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { BiodataView } from "@/components/BiodataView";
import { PrivateNote } from "@/components/Compare";
import { VoteList, VoteSummary } from "@/components/Family";
import { Icon } from "@/components/Icon";
import { GunaCard, MatchCard } from "@/components/Insights";
import { ProfileActions } from "@/components/ProfileActions";
import { gunaBetween } from "@/lib/astro";
import { requireUser } from "@/lib/auth";
import { activityLabel, biodataForViewer, blockedByThem, familyVotesFor, getBiodata, getUser, privateNote, recordView, relationBetween, savedIds } from "@/lib/data";
import { commonGround, isMutual, matchFor } from "@/lib/match";

export const metadata: Metadata = { title: "Profile" };

export default async function ProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser(`/profile/${id}`);
  if (id === user.id) redirect("/biodata");

  const [bio, relation, saved, theyBlocked, me, votes, note] = await Promise.all([
    getBiodata(id),
    relationBetween(user.id, id),
    savedIds(user.id),
    blockedByThem(user.id, id),
    getBiodata(user.id),
    familyVotesFor(user.id, id),
    privateNote(user.id, id),
  ]);
  const visible = bio && !theyBlocked && (bio.published || relation.kind === "connected" || relation.kind === "blocked");

  if (!visible) {
    return (
      <main className="auth">
        <div className="card stack">
          <h1>Profile not available</h1>
          <p className="muted">This biodata has been hidden or removed by the family.</p>
          <Link className="btn btn-gold" href="/browse">Back to browse</Link>
        </div>
      </main>
    );
  }

  const shown = biodataForViewer(bio, relation);
  const owner = bio.sample ? null : await getUser(id);
  if (!bio.sample) await recordView(user.id, id);
  const first = (bio.fullName ?? "They").split(" ")[0];
  const canLike = !bio.sample && ["none", "declined-by-me"].includes(relation.kind);
  const target = { id, name: bio.fullName ?? "", photo: shown.photos[0] ?? null };
  const guna = me ? gunaBetween(me, bio) : null;
  const insights = me ? (
    <>
      <MatchCard match={matchFor(me, bio)} mutual={isMutual(me, bio)} common={commonGround(me, bio)} theirName={first} />
      {guna && me.gender !== bio.gender ? <GunaCard result={guna.result} missing={guna.missing} manglikNote={guna.manglikNote} theirName={first} /> : null}
      {votes.length ? (
        <section className="card insight">
          <div className="card-head">
            <h2>
              <Icon name="family" /> Your family says
            </h2>
            <VoteSummary votes={votes} />
          </div>
          <VoteList votes={votes} />
        </section>
      ) : null}
      <PrivateNote id={id} initial={note} first={first} />
    </>
  ) : null;
  return (
    <main className="wrap page stack">
      {bio.sample ? (
        <p className="notice sample">
          This is a sample profile with an illustrated portrait. It shows how biodatas look on Sangam Setu, and it can&apos;t receive interests.
        </p>
      ) : null}
      <BiodataView
        bio={shown}
        isSelf={false}
        canSeeContact={relation.kind === "connected"}
        activity={owner ? activityLabel(owner.lastActive) : undefined}
        actions={<ProfileActions id={id} name={bio.fullName ?? ""} photo={target.photo} kind={relation.kind} saved={saved.includes(id)} sample={Boolean(bio.sample)} />}
        insights={insights}
        likeTarget={canLike ? target : undefined}
      />
    </main>
  );
}
