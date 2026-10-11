import type { Metadata } from "next";
import Link from "next/link";
import { KundliTool } from "@/components/KundliTool";
import { moonFrom } from "@/lib/astro";
import { currentUser } from "@/lib/auth";
import { getBiodata } from "@/lib/data";

export const metadata: Metadata = {
  title: "Free Guna Milan · Kundli matching",
  description: "Free 36-point Ashtakoota Guna Milan. Pick the groom's and bride's nakshatra and see every koota explained, with Nadi and Bhakoot dosha checks.",
};

export default async function KundliPage() {
  const user = await currentUser().catch(() => null);
  const me = user ? await getBiodata(user.id) : null;
  const moon = me ? moonFrom(me.nakshatra, me.rashi) : null;
  const mine = moon ? { nak: moon.nak, rashi: moon.rashi } : undefined;
  const initial = mine ? (me?.gender === "male" ? { groom: mine } : { bride: mine }) : undefined;

  return (
    <main className="wrap page">
      <div className="page-head">
        <div>
          <p className="eyebrow">Free tool</p>
          <h1>Guna Milan, explained</h1>
          <p>
            The traditional 36-point Ashtakoota match. Pick both nakshatras and see all eight kootas, what each one means, and any dosha to ask
            your pandit about.
          </p>
        </div>
      </div>
      <section className="card">
        <KundliTool initial={initial} />
      </section>
      <section className="koota-guide">
        <h2>What the eight kootas measure</h2>
        <dl>
          <div><dt>Varna · 1</dt><dd>Temperament and outlook on life.</dd></div>
          <div><dt>Vashya · 2</dt><dd>Mutual attraction and influence.</dd></div>
          <div><dt>Tara · 3</dt><dd>Health and fortune, from the count between the two stars.</dd></div>
          <div><dt>Yoni · 4</dt><dd>Physical compatibility, from each nakshatra&apos;s animal.</dd></div>
          <div><dt>Graha Maitri · 5</dt><dd>Friendship between the rashi lords: understanding.</dd></div>
          <div><dt>Gana · 6</dt><dd>Nature: Deva, Manushya or Rakshasa.</dd></div>
          <div><dt>Bhakoot · 7</dt><dd>Love, family welfare and prosperity.</dd></div>
          <div><dt>Nadi · 8</dt><dd>Health and children. Same nadi is the best-known dosha.</dd></div>
        </dl>
        {!user ? (
          <p className="muted">
            On Sangam Setu, Guna Milan appears on every profile automatically. <Link href="/signup">Create your free biodata</Link>.
          </p>
        ) : null}
      </section>
    </main>
  );
}
