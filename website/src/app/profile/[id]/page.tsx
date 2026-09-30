import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { BiodataView } from "@/components/BiodataView";
import { ProfileActions } from "@/components/ProfileActions";
import { requireUser } from "@/lib/auth";
import { activityLabel, biodataForViewer, blockedByThem, getBiodata, getUser, recordView, relationBetween, savedIds } from "@/lib/data";

export const metadata: Metadata = { title: "Profile" };

export default async function ProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser(`/profile/${id}`);
  if (id === user.id) redirect("/biodata");

  const [bio, relation, saved, theyBlocked] = await Promise.all([
    getBiodata(id),
    relationBetween(user.id, id),
    savedIds(user.id),
    blockedByThem(user.id, id),
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
        actions={<ProfileActions id={id} name={bio.fullName ?? ""} kind={relation.kind} saved={saved.includes(id)} sample={Boolean(bio.sample)} />}
      />
    </main>
  );
}
