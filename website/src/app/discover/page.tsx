import type { Metadata } from "next";
import Link from "next/link";
import { DiscoverDeck, type DeckItem } from "@/components/DiscoverDeck";
import { Icon } from "@/components/Icon";
import { requireUser } from "@/lib/auth";
import { ageFrom } from "@/lib/bio";
import { deck, loadCandidates } from "@/lib/feed";
import { commonGround } from "@/lib/match";

export const metadata: Metadata = { title: "Discover" };

export default async function DiscoverPage() {
  const user = await requireUser("/discover");
  const { me, list } = await loadCandidates(user);
  const items: DeckItem[] = deck(list).map((c) => {
    const b = c.bio;
    return {
      id: b.userId,
      name: b.fullName ?? "Unnamed",
      age: ageFrom(b.dob),
      height: b.height?.replace(/\s*\(.*\)$/, ""),
      place: [b.city, b.state].filter(Boolean).join(", "),
      occupation: b.occupation,
      education: b.education,
      community: [b.community, b.caste].filter(Boolean).filter((x, n, a) => a.indexOf(x) === n).join(", ") || undefined,
      religion: b.religion,
      photos: b.photos.slice(0, 4),
      photosHidden: b.photosHidden,
      verified: b.verified,
      sample: b.sample,
      online: Boolean(c.lastActive && Date.now() - c.lastActive < 3 * 60_000),
      match: c.match.score,
      reasons: c.match.reasons.slice(0, 5).map((r) => ({ label: r.label, ok: r.ok })),
      mutual: c.mutual,
      guna: c.guna,
      prompt: b.prompts?.[0],
      about: b.about ? (b.about.length > 170 ? b.about.slice(0, 167).trimEnd() + "…" : b.about) : undefined,
      common: commonGround(me, b),
    };
  });

  return (
    <main className="wrap page discover">
      <div className="page-head">
        <div>
          <h1>Discover</h1>
          <p>One profile at a time, best matches first. Pass, shortlist, or send an interest with a note.</p>
        </div>
        <Link className="btn btn-ghost btn-sm" href="/browse">
          <Icon name="grid" />
          Grid view
        </Link>
      </div>
      <DiscoverDeck items={items} published={me.published} />
    </main>
  );
}
