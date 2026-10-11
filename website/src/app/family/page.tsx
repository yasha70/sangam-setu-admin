import type { Metadata } from "next";
import Link from "next/link";
import { FamilyLinkCard, VoteList, VoteSummary } from "@/components/Family";
import { Icon } from "@/components/Icon";
import { EmptyState, PhotoOrLock } from "@/components/ProfileCard";
import { requireUser } from "@/lib/auth";
import { ageFrom } from "@/lib/bio";
import { familyLink, familyList, getBiodata, type FamilyItem } from "@/lib/data";

export const metadata: Metadata = { title: "Parivar panel" };

const GROUPS: { id: FamilyItem["group"]; title: string; note: string }[] = [
  { id: "interested", title: "Interested in you", note: "Families who sent you an interest. Your family can weigh in before you reply." },
  { id: "shortlist", title: "Your shortlist", note: "Profiles you saved. Add more with the bookmark on any profile." },
  { id: "connected", title: "Connected", note: "You've both said yes." },
];

export default async function FamilyPage() {
  const user = await requireUser("/family");
  const [link, items, me] = await Promise.all([familyLink(user.id), familyList(user.id), getBiodata(user.id)]);
  const first = (me?.fullName ?? user.name).split(" ")[0];
  const reacted = items.filter((i) => i.votes.length).length;

  return (
    <main className="wrap page">
      <div className="page-head">
        <div>
          <p className="eyebrow">Parivar panel</p>
          <h1>Decide together, the way families do</h1>
          <p>Share your list with family in one link. See every reaction and comment here.</p>
        </div>
      </div>
      <FamilyLinkCard link={link} first={first} />

      <div className="stack" style={{ marginTop: 26, gap: 26 }}>
        {items.length ? (
          <>
            <p className="muted small">
              {reacted ? `Your family has reacted to ${reacted} of ${items.length} profiles.` : `${items.length} profiles on your family's list. No reactions yet.`}
            </p>
            {GROUPS.map((g) => {
              const list = items.filter((i) => i.group === g.id);
              if (!list.length) return null;
              return (
                <section key={g.id}>
                  <div className="sec-head">
                    <div>
                      <h2>{g.title}</h2>
                      <p>{g.note}</p>
                    </div>
                  </div>
                  <div className="fam-list">
                    {list.map(({ bio, votes }) => {
                      const age = ageFrom(bio.dob);
                      return (
                        <Link key={bio.userId} href={`/profile/${bio.userId}`} className="fam-row card">
                          <span className="fam-photo"><PhotoOrLock bio={bio} /></span>
                          <span className="fam-info">
                            <b>{bio.fullName}</b>
                            <small>{[age !== null ? `${age} yrs` : null, bio.city, bio.occupation].filter(Boolean).join(" · ")}</small>
                            <VoteSummary votes={votes} />
                            <VoteList votes={votes} />
                          </span>
                          <Icon name="chevron" />
                        </Link>
                      );
                    })}
                  </div>
                </section>
              );
            })}
          </>
        ) : (
          <EmptyState
            icon="family"
            title="Your family's list is empty"
            text="Shortlist profiles with the bookmark button, and they'll appear here and on your family link."
            action={<Link className="btn btn-brand btn-sm" href="/discover">Find profiles</Link>}
          />
        )}
      </div>
    </main>
  );
}
