import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState } from "@/components/ProfileCard";
import { InterestRow, type RowData } from "@/components/InterestRow";
import { requireUser } from "@/lib/auth";
import { ageFrom } from "@/lib/bio";
import { getBiodata, getBiodatas, hiddenFor, interestsFor, listInterestIds, pendingReceivedCount, photosVisible, savedIds } from "@/lib/data";
import { matchFor } from "@/lib/match";
import type { Biodata } from "@/lib/types";

export const metadata: Metadata = { title: "Interests" };

const TABS = [
  { id: "received", label: "Received" },
  { id: "sent", label: "Sent" },
  { id: "connected", label: "Connected" },
  { id: "saved", label: "Saved" },
] as const;
type Tab = (typeof TABS)[number]["id"];

const EMPTY: Record<Tab, [string, string]> = {
  received: ["No interests yet", "When a family sends you an interest, it shows up here for you to accept or decline."],
  sent: ["You haven't sent any interests", "Open a profile you like and tap Send interest."],
  connected: ["No connections yet", "Once an interest is accepted, you can chat with them from here."],
  saved: ["Nothing saved yet", "Tap the bookmark on any profile to keep it here."],
};

function line(b: Biodata) {
  const age = ageFrom(b.dob);
  return [age !== null ? `${age} yrs` : null, b.city, b.occupation].filter(Boolean).join(" · ");
}

export default async function InterestsPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const user = await requireUser("/interests");
  const { tab: rawTab } = await searchParams;
  const tab: Tab = (TABS.find((t) => t.id === rawTab)?.id ?? "received") as Tab;

  const [ids, saved, hidden] = await Promise.all([listInterestIds(user.id), savedIds(user.id), hiddenFor(user.id)]);
  const idsFor: Record<Tab, string[]> = { received: ids.received, sent: ids.sent, connected: ids.connected, saved };
  const list = idsFor[tab].filter((i) => !hidden.has(i));
  const [bios, rels, me] = await Promise.all([getBiodatas(list), interestsFor(user.id, list), getBiodata(user.id)]);
  const when = (ts?: number) => {
    if (!ts) return undefined;
    const d = Math.floor((Date.now() - ts) / 86400_000);
    return d < 1 ? "today" : d === 1 ? "yesterday" : d < 30 ? `${d} days ago` : new Date(ts).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
  };

  const rows: RowData[] = [];
  list.forEach((id, n) => {
    const b = bios[n];
    const r = rels.get(id);
    if (!b) return;
    const base = {
      id,
      name: b.fullName ?? "Unnamed",
      photo: photosVisible(b, r?.theirs, r?.mine) ? b.photos[0] : undefined,
      line: line(b),
      match: me ? matchFor(me, b).score : undefined,
    };
    const connected = r?.mine?.status === "accepted" || r?.theirs?.status === "accepted";
    if (tab === "received" && r?.theirs?.status === "pending") rows.push({ ...base, mode: "received", note: r.theirs.note, liked: r.theirs.liked, when: when(r.theirs.createdAt) });
    if (tab === "sent" && r?.mine?.status === "pending") rows.push({ ...base, mode: "sent", note: r.mine.note, liked: r.mine.liked, when: when(r.mine.createdAt) });
    if (tab === "sent" && r?.mine?.status === "declined") rows.push({ ...base, mode: "sent-declined" });
    if (tab === "connected" && connected) rows.push({ ...base, mode: "connected" });
    if (tab === "saved" && (b.published || connected)) rows.push({ ...base, mode: connected ? "connected" : "saved" });
  });

  const pendingCount = tab === "received" ? 0 : await pendingReceivedCount(user.id);

  return (
    <main className="wrap page">
      <div className="page-head">
        <div>
          <h1>Interests</h1>
          <p>Accept an interest to start chatting and to share contact details with each other.</p>
        </div>
      </div>
      <nav className="seg" aria-label="Interest lists">
        {TABS.map((t) => (
          <Link key={t.id} href={`/interests?tab=${t.id}`} aria-current={tab === t.id ? "page" : undefined}>
            {t.label}
            {t.id === "received" && tab !== "received" && pendingCount ? <span className="badge">{pendingCount}</span> : null}
          </Link>
        ))}
      </nav>
      {rows.length ? (
        <div className="list">
          {rows.map((r) => (
            <InterestRow key={r.id} r={r} />
          ))}
        </div>
      ) : (
        <EmptyState
          title={EMPTY[tab][0]}
          text={EMPTY[tab][1]}
          action={<Link className="btn btn-ghost btn-sm" href="/browse">Browse profiles</Link>}
        />
      )}
    </main>
  );
}
