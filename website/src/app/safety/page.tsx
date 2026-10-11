import type { Metadata } from "next";
import Link from "next/link";
import { Icon } from "@/components/Icon";

export const metadata: Metadata = {
  title: "Safety centre",
  description: "How to stay safe while looking for a match online: money, meeting, verification and reporting.",
};

const TIPS: { icon: string; title: string; points: string[] }[] = [
  {
    icon: "shield",
    title: "Never send money",
    points: [
      "No genuine match will ask you for money, a loan, gift cards, crypto, or fees for customs, courier or visas.",
      "Never share an OTP, UPI PIN, card number or bank login, even if they say it's to send you something.",
      "Sangam Setu shows a warning in chat when a message mentions money or bank details. Take it seriously.",
    ],
  },
  {
    icon: "family",
    title: "Involve your family early",
    points: [
      "Share profiles with your family using the Parivar panel and talk it over together.",
      "Let a family member speak to theirs before you meet. Real families are happy to talk.",
    ],
  },
  {
    icon: "video",
    title: "Talk before you meet",
    points: [
      "Have a voice or video call in the app first. It's private and doesn't share your number.",
      "Be wary if someone always has an excuse not to video call.",
    ],
  },
  {
    icon: "coffee",
    title: "Meet safely",
    points: [
      "For the first meeting, choose a busy public place in the daytime, or a family visit.",
      "Tell someone where you're going and arrange your own travel.",
      "Use Plan a meeting in chat so the date, time and place are written down.",
    ],
  },
  {
    icon: "check",
    title: "Check the details",
    points: [
      "Look for the blue Verified tick, but still confirm job, education and family details yourself.",
      "A Google search of the name and company, or a call to the workplace, catches most fake profiles.",
      "Profiles with only one perfect photo and little detail deserve extra care.",
    ],
  },
  {
    icon: "lock",
    title: "Protect your privacy",
    points: [
      "Your full address is never shown, and your number appears only after you both accept.",
      "Turn on photo privacy in your biodata to show photos only to people you're interested in.",
      "You can delete a message for everyone within an hour of sending it.",
    ],
  },
];

export default function SafetyPage() {
  return (
    <main className="wrap page">
      <div className="page-head">
        <div>
          <p className="eyebrow">Safety centre</p>
          <h1>Find your match, safely</h1>
          <p>Most families on Sangam Setu are genuine. These habits keep you safe from the few who aren&apos;t.</p>
        </div>
      </div>
      <div className="safety-grid">
        {TIPS.map((t) => (
          <section key={t.title} className="card safety-card">
            <span className="promo-ico"><Icon name={t.icon} /></span>
            <h2>{t.title}</h2>
            <ul>
              {t.points.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
          </section>
        ))}
      </div>
      <section className="card report-help">
        <h2>Something feels wrong?</h2>
        <p className="muted">
          Open their profile and tap <b>Report</b>, or <b>Block</b> them from the chat menu. Our team reviews every report, and the person
          isn&apos;t told who reported them. If you&apos;ve lost money, call the national cyber crime helpline <b>1930</b> or report at{" "}
          <a href="https://cybercrime.gov.in" target="_blank" rel="noreferrer">cybercrime.gov.in</a>.
        </p>
        <Link className="btn btn-ghost btn-sm" href="/interests?tab=connected">Go to my connections</Link>
      </section>
    </main>
  );
}
