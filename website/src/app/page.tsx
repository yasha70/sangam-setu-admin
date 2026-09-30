import Link from "next/link";
import { redirect } from "next/navigation";
import { Icon } from "@/components/Icon";
import { currentUserId } from "@/lib/auth";
import { ageFrom } from "@/lib/bio";
import { sampleBiodatas } from "@/lib/samples";

export default async function Home() {
  if (await currentUserId()) redirect("/browse");
  const all = sampleBiodatas();
  const strip = [0, 1, 2, 3, 4, 5].map((i) => all[i % 2 === 0 ? i / 2 : 12 + (i - 1) / 2]);

  return (
    <main>
      <section className="hero" aria-labelledby="hero-title">
        <div className="wrap">
          <div className="hero-copy">
            <p className="eyebrow row" style={{ gap: 12 }}>
              <span className="deva" lang="hi">संगम सेतु</span>Matrimony for families
            </p>
            <h1 id="hero-title">
              A rishta deserves more than a <em>forwarded biodata.</em>
            </h1>
            <p className="lede">
              Create your biodata once. Families see only your city until you say yes. When both sides accept, you can
              chat right here and see each other&apos;s contact number. And your biodata downloads as a PDF worth
              sending.
            </p>
            <div className="actions">
              <Link className="btn btn-gold" href="/signup">Create free biodata</Link>
              <Link className="btn btn-ghost" href="/login">Log in</Link>
            </div>
          </div>

          <div className="mock" role="img" aria-label="A family group chat. A forwarded biodata PDF with a full address goes around, and the reply shares a designed Sangam Setu biodata instead.">
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
              <div className="msg in">
                <span className="who" style={{ color: "var(--sky)" }}>Papa</span>
                Ye wala toh 6 groups mein aa chuka hai.<span className="time">10:40</span>
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
        </div>
      </section>

      <section className="section" style={{ paddingTop: 0 }}>
        <div className="wrap">
          <div className="section-head">
            <span className="chip-date">A glimpse inside</span>
            <h2>Biodatas the way <em>families read them</em></h2>
            <p>Sample profiles, drawn to show how biodatas look. Create yours to see real families near you.</p>
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

      <section className="section" style={{ paddingTop: 0 }}>
        <div className="wrap">
          <div className="features">
            <div className="feature">
              <Icon name="doc" />
              <h3>Build your biodata</h3>
              <p>Personal, horoscope, education, family and partner expectations, with up to four photos.</p>
            </div>
            <div className="feature">
              <Icon name="search" />
              <h3>See other biodatas</h3>
              <p>Filter by age, state, community and marital status. Save the ones you like.</p>
            </div>
            <div className="feature">
              <Icon name="chat" />
              <h3>Chat in real time</h3>
              <p>Send an interest. Once it&apos;s accepted, chat instantly and see when your message is read.</p>
            </div>
            <div className="feature">
              <Icon name="download" />
              <h3>Download a designed PDF</h3>
              <p>Three print-quality designs with crisp text and full-resolution photos. Ready for WhatsApp or print.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="section" style={{ paddingTop: 0 }}>
        <div className="wrap">
          <div className="section-head">
            <span className="chip-date">Privacy by design</span>
            <h2>Your family&apos;s details stay private <em>until you say yes</em></h2>
          </div>
          <div className="promise">
            <div><Icon name="pin" /><b>Only the city is shown</b><span>Your full address is never shown on your profile. It prints only on your own PDF, if you choose.</span></div>
            <div><Icon name="lock" /><b>Numbers after acceptance</b><span>Contact details appear only when an interest is accepted, and then to both sides.</span></div>
            <div><Icon name="chat" /><b>No messages from strangers</b><span>Chat opens only between two people who have both said yes.</span></div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="wrap closing">
          <blockquote lang="hi-Latn">
            Rishte forward nahi kiye jaate, <em>jode jaate hain.</em>
          </blockquote>
          <p className="muted">Relationships aren&apos;t forwarded. They&apos;re joined.</p>
          <Link className="btn btn-gold" href="/signup">Create free biodata</Link>
        </div>
      </section>

      <footer className="site-footer">
        <div className="wrap">
          <span>© 2026 Sangam Setu</span>
          <span>Matrimony for families</span>
        </div>
      </footer>
    </main>
  );
}
