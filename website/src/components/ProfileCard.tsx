import Link from "next/link";
import { Icon, Silhouette } from "./Icon";
import { SaveButton } from "./SaveButton";
import { ageFrom } from "@/lib/bio";
import type { Biodata } from "@/lib/types";

export type CardStatus = "none" | "sent" | "received" | "connected" | "declined";

const STATUS: Record<Exclude<CardStatus, "none">, { text: string; cls: string }> = {
  sent: { text: "Interest sent", cls: "pill" },
  received: { text: "Interested in you", cls: "pill rose" },
  connected: { text: "Connected", cls: "pill ok" },
  declined: { text: "Declined", cls: "pill" },
};

export function ProfileCard({ bio, saved, status }: { bio: Biodata; saved: boolean; status: CardStatus }) {
  const age = ageFrom(bio.dob);
  const height = bio.height?.replace(/\s*\(.*\)$/, "");
  const photo = bio.photos[0];
  return (
    <article className="pcard">
      <Link href={`/profile/${bio.userId}`} style={{ textDecoration: "none", color: "inherit", display: "flex", flexDirection: "column", height: "100%" }}>
        <div className="ph">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {photo ? <img src={photo} alt="" loading="lazy" /> : <Silhouette />}
          {status !== "none" ? <span className={`${STATUS[status].cls} status`}>{STATUS[status].text}</span> : null}
          {bio.sample ? <span className="pill sample sample-tag">Sample profile</span> : null}
        </div>
        <div className="body">
          <span className="nm">{bio.fullName ?? "Unnamed"}</span>
          <span className="meta">{[age !== null ? `${age} yrs` : null, height, bio.city].filter(Boolean).join(" · ")}</span>
          <span className="meta2">{[bio.occupation, bio.community || bio.caste].filter(Boolean).join(" · ")}</span>
        </div>
      </Link>
      <SaveButton id={bio.userId} initial={saved} />
    </article>
  );
}

export function EmptyState({ title, text, action }: { title: string; text: string; action?: React.ReactNode }) {
  return (
    <div className="empty card">
      <Icon name="search" className="ico" />
      <h3>{title}</h3>
      <p>{text}</p>
      {action}
    </div>
  );
}
