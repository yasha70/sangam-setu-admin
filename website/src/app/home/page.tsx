import type { Metadata } from "next";
import Link from "next/link";
import { Icon, Silhouette } from "@/components/Icon";
import { Ring } from "@/components/Insights";
import { InstallApp } from "@/components/InstallApp";
import { InterestRow, type RowData } from "@/components/InterestRow";
import { ProfileCard } from "@/components/ProfileCard";
import { requireUser } from "@/lib/auth";
import { ageFrom, strengthScore, strengthSteps } from "@/lib/bio";
import { day, familyLink, getBiodatas, unreadTotal, viewsFor } from "@/lib/data";
import { dailyPicks, loadCandidates, rankScore, stateOf, type Candidate } from "@/lib/feed";

export const metadata: Metadata = { title: "Home" };

function greeting() {
  const h = new Date(Date.now() + 5.5 * 3600_000).getUTCHours();
  if (h >= 4 && h < 12) return { hi: "Suprabhat", sub: "A fresh set of rishte is ready for you this morning." };
  if (h >= 12 && h < 17) return { hi: "Namaste", sub: "Here's what's new since you last looked." };
  if (h >= 17 && h < 22) return { hi: "Shubh sandhya", sub: "Settle in with chai and today's picks." };
  return { hi: "Namaste", sub: "Late night? Here's a quiet look at today's picks." };
}

const online = (c: Candidate) => Boolean(c.lastActive && Date.now() - c.lastActive < 3 * 60_000);

function Card({ c }: { c: Candidate }) {
  return <ProfileCard bio={c.bio} saved={c.saved} status={stateOf(c)} match={c.match.score} mutual={c.mutual} guna={c.guna} online={online(c)} />;
}

export default async function HomePage() {
  const user = await requireUser("/home");
  const { me, list } = await loadCandidates(user);
  const today = day();
  const picks = dailyPicks(list, user.id, today, 6);
  const pickIds = new Set(picks.map((c) => c.bio.userId));
  const interested = list.filter((c) => stateOf(c) === "received").sort((a, b) => (b.theirs?.createdAt ?? 0) - (a.theirs?.createdAt ?? 0));
  const mutual = list
    .filter((c) => c.mutual && stateOf(c) === "none" && !pickIds.has(c.bio.userId) && !c.passed)
    .sort((a, b) => rankScore(b) - rankScore(a))
    .slice(0, 8);
  const mutualIds = new Set(mutual.map((c) => c.bio.userId));
  const fresh = list
    .filter((c) => !c.bio.sample && stateOf(c) === "none" && Date.now() - c.bio.updatedAt < 14 * 86400_000 && !pickIds.has(c.bio.userId) && !mutualIds.has(c.bio.userId))
    .sort((a, b) => b.bio.updatedAt - a.bio.updatedAt)
    .slice(0, 8);
  const [views, unread, fam] = await Promise.all([viewsFor(user.id), unreadTotal(user.id), familyLink(user.id)]);
  const viewers = (await getBiodatas(views.recent.slice(0, 6))).filter((b) => b && (b.published || b.sample));
  const steps = strengthSteps(me);
  const strength = strengthScore(me);
  const g = greeting();
  const first = (me.fullName ?? user.name).split(" ")[0];
  const fresh5 = list.filter((c) => stateOf(c) === "none" && !c.passed).length;

  const interestRows: RowData[] = interested.slice(0, 4).map((c) => {
    const age = ageFrom(c.bio.dob);
    return {
      id: c.bio.userId,
      name: c.bio.fullName ?? "Unnamed",
      photo: c.bio.photos[0],
      line: [age !== null ? `${age} yrs` : null, c.bio.city, c.bio.occupation].filter(Boolean).join(" · "),
      mode: "received",
      note: c.theirs?.note,
      liked: c.theirs?.liked,
      match: c.match.score,
    };
  });

  return (
    <main className="wrap page home">
      <section className="welcome">
        <div>
          <p className="eyebrow">{new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", timeZone: "Asia/Kolkata" })}</p>
          <h1>
            {g.hi}, <em>{first}</em>
          </h1>
          <p className="muted">{g.sub}</p>
        </div>
        <div className="welcome-stats">
          <Link href="/interests" className="stat">
            <b>{interested.length}</b>
            <span>interested in you</span>
          </Link>
          <Link href="/chat" className="stat">
            <b>{unread}</b>
            <span>unread {unread === 1 ? "message" : "messages"}</span>
          </Link>
          <Link href="/biodata" className="stat">
            <b>{views.count}</b>
            <span>profile {views.count === 1 ? "view" : "views"}</span>
          </Link>
        </div>
      </section>

      {!me.published ? (
        <Link href="/biodata/edit" className="notice publish-nudge">
          <Icon name="info" />
          <span>
            <b>Your biodata isn&apos;t live yet.</b> You can look around, but families can&apos;t see you and you can&apos;t send interests until you publish.
          </span>
          <span className="btn btn-gold btn-sm">Finish biodata</span>
        </Link>
      ) : null}

      <div className="home-grid">
        <div className="stack home-main">
          <section>
            <div className="sec-head">
              <div>
                <h2>Aaj ke rishte</h2>
                <p>Today&apos;s picks, chosen from your best matches. A new set every morning.</p>
              </div>
              <Link className="btn btn-brand btn-sm" href="/discover">
                <Icon name="compass" />
                Open Discover{fresh5 ? ` · ${fresh5}` : ""}
              </Link>
            </div>
            {picks.length ? (
              <div className="cards cards-3">
                {picks.map((c) => (
                  <Card key={c.bio.userId} c={c} />
                ))}
              </div>
            ) : (
              <div className="card empty">
                <span className="empty-ico"><Icon name="sparkle" /></span>
                <h3>You&apos;ve seen everyone for now</h3>
                <p>New families join every day. Widen your preferences or search all profiles meanwhile.</p>
                <Link className="btn btn-ghost btn-sm" href="/browse">Search all profiles</Link>
              </div>
            )}
          </section>

          {interestRows.length ? (
            <section>
              <div className="sec-head">
                <div>
                  <h2>Interested in you</h2>
                  <p>Accept to open a chat and share contact details with each other.</p>
                </div>
                <Link className="btn btn-quiet btn-sm" href="/interests">
                  See all {interested.length}
                  <Icon name="chevron" />
                </Link>
              </div>
              <div className="list">
                {interestRows.map((r) => (
                  <InterestRow key={r.id} r={r} />
                ))}
              </div>
            </section>
          ) : null}

          {mutual.length ? (
            <section>
              <div className="sec-head">
                <div>
                  <h2>Mutual matches</h2>
                  <p>You fit what they&apos;re looking for, and they fit you.</p>
                </div>
              </div>
              <div className="scroller">
                {mutual.map((c) => (
                  <Card key={c.bio.userId} c={c} />
                ))}
              </div>
            </section>
          ) : null}

          {fresh.length ? (
            <section>
              <div className="sec-head">
                <div>
                  <h2>New on Sangam Setu</h2>
                  <p>Families who joined or updated their biodata in the last two weeks.</p>
                </div>
              </div>
              <div className="scroller">
                {fresh.map((c) => (
                  <Card key={c.bio.userId} c={c} />
                ))}
              </div>
            </section>
          ) : null}
        </div>

        <aside className="stack home-side">
          <section className="card strength">
            <div className="row" style={{ gap: 14, flexWrap: "nowrap" }}>
              <Ring value={strength} size={70} label="strong" tone={strength >= 75 ? "green" : "brand"} />
              <div>
                <h2>Profile strength</h2>
                <p className="muted small">{strength === 100 ? "Everything's in place. Lovely!" : "Each step brings more and better interests."}</p>
              </div>
            </div>
            <ul className="steps">
              {steps.map((s) => (
                <li key={s.id} data-done={s.done ? "true" : "false"}>
                  <Link href={s.href}>
                    <span className="tick" aria-hidden="true">{s.done ? <Icon name="check" /> : null}</span>
                    <span>
                      <b>{s.label}</b>
                      {!s.done ? <small>{s.why}</small> : null}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>

          <section className="card family-promo">
            <span className="promo-ico"><Icon name="family" /></span>
            <h2>Parivar panel</h2>
            <p className="muted small">
              Send one private link to Mummy, Papa or Didi. They can see your shortlist and react with ❤️ 👍 🤔 without signing up.
            </p>
            <Link className="btn btn-gold btn-sm" href="/family">{fam ? "Open Parivar panel" : "Invite your family"}</Link>
          </section>

          <section className="card kundli-promo">
            <span className="promo-ico moon"><Icon name="moon" /></span>
            <h2>Free Guna Milan</h2>
            <p className="muted small">
              {me.nakshatra
                ? `Your nakshatra is ${me.nakshatra}. Every profile shows your 36-point match automatically.`
                : "Add your nakshatra once and every profile shows your 36-point kundli match."}
            </p>
            <Link className="btn btn-ghost btn-sm" href={me.nakshatra ? "/kundli" : "/biodata/edit#horoscope"}>
              {me.nakshatra ? "Try the kundli tool" : "Add nakshatra"}
            </Link>
          </section>

          {viewers.length ? (
            <section className="card">
              <div className="card-head">
                <h2>Viewed you</h2>
                <Link className="small" href="/biodata">See all</Link>
              </div>
              <div className="viewers">
                {viewers.map((b) => (
                  <Link key={b!.userId} href={`/profile/${b!.userId}`} title={b!.fullName}>
                    <span className="avatar">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      {b!.photos[0] && b!.photoPrivacy !== "interest" ? <img src={b!.photos[0]} alt="" /> : <Silhouette />}
                    </span>
                    <small>{b!.fullName?.split(" ")[0]}</small>
                  </Link>
                ))}
              </div>
            </section>
          ) : null}

          <InstallApp />
        </aside>
      </div>
    </main>
  );
}
