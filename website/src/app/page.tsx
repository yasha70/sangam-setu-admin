import Link from "next/link";
import { redirect } from "next/navigation";
import { Icon, Lotus, VerifiedTick } from "@/components/Icon";
import { Ring } from "@/components/Insights";
import { KundliTool } from "@/components/KundliTool";
import { gunaBetween } from "@/lib/astro";
import { currentUserId } from "@/lib/auth";
import { ageFrom } from "@/lib/bio";
import { matchFor } from "@/lib/match";
import { sampleBiodatas } from "@/lib/samples";

const FAQ = [
  ["Is Sangam Setu free?", "Yes. Creating a biodata, browsing, sending interests, chatting, Guna Milan, the family panel and PDF downloads are all free."],
  ["Who can see my phone number?", "Only people you've connected with, meaning one of you sent an interest and the other accepted. Your full address is never shown on your profile."],
  ["Can parents create the profile?", "Yes. Choose who the profile is for when you sign up: yourself, a son, daughter, brother, sister, relative or friend."],
  ["How is the match percentage worked out?", "From your partner preferences: age, height, religion, community, marital status, diet, mother tongue, location and manglik. Every profile shows which ones fit and which don't."],
  ["How accurate is Guna Milan?", "It uses the standard 36-point Ashtakoota tables from each person's Moon nakshatra and rashi. Tables differ slightly between panchangs, so use it as a guide and confirm with your family pandit."],
  ["Do I need to download an app?", "No. Sangam Setu works in your phone's browser, and you can add it to your home screen so it opens like an app."],
];

export default async function Home() {
  if (await currentUserId()) redirect("/home");
  const all = sampleBiodatas();
  const bride = all.find((b) => b.fullName === "Riya Mehta")!;
  const groom = all.find((b) => b.fullName === "Siddharth Jain")!;
  const fit = matchFor(groom, bride).score;
  const guna = gunaBetween(groom, bride).result;
  const strip = [0, 1, 2, 3, 4, 5].map((i) => all[i % 2 === 0 ? i / 2 : 12 + (i - 1) / 2]);

  return (
    <main className="landing">
      <section className="l-hero" aria-labelledby="hero-title">
        <div className="wrap l-hero-grid">
          <div className="hero-copy">
            <p className="eyebrow row" style={{ gap: 12 }}>
              <span className="deva" lang="hi">संगम सेतु</span>Matrimony for families
            </p>
            <h1 id="hero-title">
              Where two families find their <em>setu</em>.
            </h1>
            <p className="lede">
              A beautiful biodata, matches that explain themselves, free Guna Milan on every profile, and a private link that lets the whole
              family weigh in. Numbers are shared only when both sides say yes.
            </p>
            <div className="actions">
              <Link className="btn btn-gold btn-lg" href="/signup">Create free biodata</Link>
              <Link className="btn btn-ghost btn-lg" href="/kundli">
                <Icon name="moon" />
                Try Guna Milan
              </Link>
            </div>
            <ul className="trust">
              <li><Icon name="check" />Free to join and use</li>
              <li><Icon name="check" />No brokers, no paid contacts</li>
              <li><Icon name="check" />Works on any phone, no app download</li>
            </ul>
          </div>

          <div className="hero-art" aria-label="A preview of the Discover screen showing a sample profile with match score and Guna Milan">
            <div className="phone">
              <div className="phone-top">
                <Lotus />
                <b>Discover</b>
                <span>3 of 18</span>
              </div>
              <div className="dcard demo">
                <div className="dphoto">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={bride.photos[0]} alt="" />
                  <div className="dshade">
                    <div className="dbadges">
                      <span className="match-badge"><b>{fit}%</b> match</span>
                      {guna ? <span className="pill guna-chip"><Icon name="moon" />Guna {guna.total}/36</span> : null}
                    </div>
                    <h2>
                      <span>{bride.fullName?.split(" ")[0]}<small>, {ageFrom(bride.dob)}</small></span>
                      <VerifiedTick />
                    </h2>
                    <p>{bride.occupation} · {bride.city}</p>
                  </div>
                </div>
                <div className="dbody">
                  <div className="dprompt">
                    <small>{bride.prompts?.[0]?.q}</small>
                    <p>{bride.prompts?.[0]?.a}</p>
                  </div>
                </div>
              </div>
              <div className="deck-actions mini" aria-hidden="true">
                <span className="dbtn pass"><Icon name="x" /></span>
                <span className="dbtn love"><Icon name="heart" /></span>
                <span className="dbtn save"><Icon name="bookmark" /></span>
              </div>
            </div>
            <span className="float-chip f1"><span>❤️</span><b>Mummy</b> loved this profile</span>
            <span className="float-chip f2"><span>✨</span>Mutual match</span>
            <span className="float-chip f3"><span>🎉</span>Rishta jud gaya!</span>
          </div>
        </div>
      </section>

      <section className="section how" aria-labelledby="how-title">
        <div className="wrap">
          <div className="section-head">
            <span className="chip-date">How it works</span>
            <h2 id="how-title">From biodata to <em>baat-cheet</em> in four steps</h2>
          </div>
          <ol className="steps-4">
            <li>
              <span className="n">1</span>
              <h3>Create your biodata</h3>
              <p>Personal, family, horoscope and career details, photos, and three prompts that show who you really are.</p>
            </li>
            <li>
              <span className="n">2</span>
              <h3>Discover with reasons</h3>
              <p>Daily picks and a swipe-style deck, each with a match score that shows exactly which preferences fit.</p>
            </li>
            <li>
              <span className="n">3</span>
              <h3>Ask the family</h3>
              <p>Share your shortlist in one private link. Mummy, Papa and Didi react with ❤️ 👍 🤔 without signing up.</p>
            </li>
            <li>
              <span className="n">4</span>
              <h3>Connect and meet</h3>
              <p>When both say yes, chat opens, numbers are shared, and you can plan a video call or family visit right in the chat.</p>
            </li>
          </ol>
        </div>
      </section>

      <section className="section" style={{ paddingTop: 0 }} aria-labelledby="bento-title">
        <div className="wrap">
          <div className="section-head">
            <span className="chip-date">Only on Sangam Setu</span>
            <h2 id="bento-title">Built for the way <em>Indian families</em> actually decide</h2>
          </div>
          <div className="bento">
            <article className="b-tile b-guna">
              <Icon name="moon" />
              <h3>Free Guna Milan on every profile</h3>
              <p>All eight kootas explained, with Nadi and Bhakoot dosha checks. No paid kundli reports.</p>
              {guna ? (
                <div className="b-guna-demo">
                  <Ring value={guna.total} max={36} size={84} label="of 36" tone="green" />
                  <ul>
                    {guna.kootas.slice(4).map((k) => (
                      <li key={k.key}>
                        <span>{k.name}</span>
                        <i style={{ width: `${(k.got / k.max) * 100}%` }} />
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </article>
            <article className="b-tile b-family">
              <Icon name="family" />
              <h3>Parivar panel</h3>
              <p>One private link for the family group. Everyone reacts and comments; you see it all in one place.</p>
              <div className="b-votes">
                <span>❤️ Mummy</span>
                <span>👍 Papa</span>
                <span>🤔 Didi: &ldquo;Let&apos;s call them Sunday&rdquo;</span>
              </div>
            </article>
            <article className="b-tile b-prompts">
              <Icon name="quote" />
              <h3>Prompts worth replying to</h3>
              <p>Like an answer and send a note with your interest. It becomes your first message when they accept.</p>
              <blockquote>
                <small>A perfect Sunday at home looks like…</small>
                Dal baati on the stove and Papa&apos;s old Kishore Kumar playlist.
              </blockquote>
            </article>
            <article className="b-tile b-match">
              <Icon name="sparkle" />
              <h3>Matches that explain themselves</h3>
              <p>See which preferences fit and which don&apos;t. Mutual matches are marked when you fit them too.</p>
            </article>
            <article className="b-tile b-meet">
              <Icon name="calendar" />
              <h3>Plan the first meeting</h3>
              <p>Propose a video call, coffee or family visit in chat. They accept with one tap and it goes in the calendar.</p>
            </article>
            <article className="b-tile b-pdf">
              <Icon name="download" />
              <h3>A biodata PDF worth forwarding</h3>
              <p>Three print-quality designs with your photos, ready for WhatsApp or the printer.</p>
            </article>
          </div>
        </div>
      </section>

      <section className="section kundli-sec" aria-labelledby="kundli-title">
        <div className="wrap">
          <div className="section-head">
            <span className="chip-date">Try it now, free</span>
            <h2 id="kundli-title">Guna Milan in <em>ten seconds</em></h2>
            <p>Pick the groom&apos;s and bride&apos;s nakshatra. No sign-up needed.</p>
          </div>
          <div className="card kundli-card">
            <KundliTool compact initial={{ groom: { nak: 7, rashi: 3 }, bride: { nak: 12, rashi: 5 } }} />
          </div>
        </div>
      </section>

      <section className="section" style={{ paddingTop: 0 }}>
        <div className="wrap">
          <div className="section-head">
            <span className="chip-date">A glimpse inside</span>
            <h2>Biodatas the way <em>families read them</em></h2>
            <p>Sample profiles with drawn portraits, to show how biodatas look. Create yours to see real families near you.</p>
          </div>
          <div className="strip">
            {strip.map((b) => (
              <Link key={b.userId} href="/signup">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={b.photos[0]} alt={`Sample profile of ${b.fullName}`} />
                <span>
                  <b>{b.fullName?.split(" ")[0]}, {ageFrom(b.dob)}</b>
                  {b.occupation} · {b.city}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="section why" aria-labelledby="why-title">
        <div className="wrap why-grid">
          <div className="mock" role="img" aria-label="A family group chat. A forwarded biodata PDF with a full address goes around, and the reply shares a Sangam Setu biodata instead.">
            <div className="mock-top">
              <span className="gav"><Icon name="group" /></span>
              <div style={{ minWidth: 0 }}>
                <b>Sharma Parivar</b>
                <small>Mausi, Papa, Chachu, You and 38 others</small>
              </div>
            </div>
            <div className="mock-body">
              <span className="chip-date">Today</span>
              <div className="msg in">
                <span className="who" style={{ color: "var(--rose)" }}>Mausi</span>
                <span className="fwd-label"><Icon name="fwd" />Forwarded many times</span>
                <div className="doc">
                  <span className="pdf">PDF</span>
                  <div><b>Biodata_FINAL_final (2).pdf</b><small>Scanned · full address and phone inside</small></div>
                </div>
                Ladka engineer hai, Indore. Kisi ne check kiya?<span className="time">10:38</span>
              </div>
              <div className="msg out">
                <div className="doc good">
                  <span className="pdf">PDF</span>
                  <div><b>Aditya-Joshi-Biodata.pdf</b><small>Royal Maroon design · Sangam Setu</small></div>
                </div>
                Sangam Setu pe dekhiye. Number tabhi milta hai jab dono taraf se haan ho.
                <span className="time">10:42 <Icon name="dtick" className="ico read" /></span>
              </div>
            </div>
          </div>
          <div className="stack" style={{ gap: 18 }}>
            <span className="chip-date" style={{ justifySelf: "start" }}>Why we built this</span>
            <h2 id="why-title">A rishta deserves more than a <em>forwarded biodata</em></h2>
            <p className="muted">
              Biodatas travel through dozens of WhatsApp groups with phone numbers and home addresses inside. Sangam Setu keeps your family&apos;s
              details private until you say yes.
            </p>
            <div className="promise">
              <div><Icon name="pin" /><b>Only the city is shown</b><span>Your full address never appears on your profile.</span></div>
              <div><Icon name="lock" /><b>Numbers after acceptance</b><span>Contact details appear only when both sides agree.</span></div>
              <div><Icon name="shield" /><b>Private photos, if you like</b><span>Show photos only to people you&apos;re interested in.</span></div>
            </div>
          </div>
        </div>
      </section>

      <section className="section" style={{ paddingTop: 0 }} aria-labelledby="faq-title">
        <div className="wrap faq">
          <h2 id="faq-title">Questions families ask</h2>
          {FAQ.map(([q, a]) => (
            <details key={q}>
              <summary>{q}</summary>
              <p>{a}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="section">
        <div className="wrap closing">
          <blockquote lang="hi-Latn">
            Rishte forward nahi kiye jaate, <em>jode jaate hain.</em>
          </blockquote>
          <p className="muted">Relationships aren&apos;t forwarded. They&apos;re joined.</p>
          <Link className="btn btn-gold btn-lg" href="/signup">Create free biodata</Link>
        </div>
      </section>

      <footer className="site-footer">
        <div className="wrap">
          <span className="row" style={{ gap: 8 }}><Lotus className="foot-lotus" />© 2026 Sangam Setu</span>
          <nav className="row" aria-label="Footer">
            <Link href="/kundli">Guna Milan</Link>
            <Link href="/safety">Safety</Link>
            <Link href="/signup">Create biodata</Link>
            <Link href="/login">Log in</Link>
          </nav>
        </div>
      </footer>
    </main>
  );
}
