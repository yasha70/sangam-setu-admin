import type { Metadata } from "next";
import Link from "next/link";
import { Icon, Silhouette } from "@/components/Icon";
import { EmptyState } from "@/components/ProfileCard";
import { requireUser } from "@/lib/auth";
import { getBiodatas, listNotices, markNoticesSeen, noticesSeenAt } from "@/lib/data";
import type { NoticeType } from "@/lib/types";

export const metadata: Metadata = { title: "Notifications" };

const ICON: Record<NoticeType, string> = { interest: "heart", accepted: "sparkle", view: "eye", family: "family", meet: "calendar" };

function ago(ts: number) {
  const m = Math.floor((Date.now() - ts) / 60_000);
  if (m < 1) return "just now";
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return d < 7 ? `${d}d ago` : new Date(ts).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

export default async function NotificationsPage() {
  const user = await requireUser("/notifications");
  const [notices, seenAt] = await Promise.all([listNotices(user.id, 60), noticesSeenAt(user.id)]);
  await markNoticesSeen(user.id);
  const bios = await getBiodatas(notices.map((n) => n.who ?? "none"));

  return (
    <main className="wrap page narrow">
      <div className="page-head">
        <div>
          <h1>Notifications</h1>
          <p>Interests, acceptances, profile views, family reactions and meeting plans.</p>
        </div>
      </div>
      {notices.length ? (
        <ol className="notices">
          {notices.map((n, i) => {
            const b = bios[i];
            const photo = b && b.photoPrivacy !== "interest" ? b.photos[0] : null;
            return (
              <li key={n.id} data-new={n.ts > seenAt ? "true" : undefined} data-type={n.type}>
                <Link href={n.link}>
                  <span className="avatar sm">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {photo ? <img src={photo} alt="" /> : <Silhouette />}
                    <span className="n-ico"><Icon name={ICON[n.type]} /></span>
                  </span>
                  <span className="n-text">
                    {n.text}
                    <small>{ago(n.ts)}</small>
                  </span>
                  {n.ts > seenAt ? <span className="n-dot" aria-label="New" /> : null}
                </Link>
              </li>
            );
          })}
        </ol>
      ) : (
        <EmptyState
          icon="bell"
          title="Nothing yet"
          text="When someone sends you an interest, views your profile or your family reacts to a profile, you'll see it here."
          action={<Link className="btn btn-brand btn-sm" href="/discover">Start discovering</Link>}
        />
      )}
    </main>
  );
}
