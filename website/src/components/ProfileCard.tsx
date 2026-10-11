import Link from "next/link";
import { Icon, Silhouette, VerifiedTick } from "./Icon";
import { Ring } from "./Insights";
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

export function PhotoOrLock({ bio, eager = false }: { bio: Biodata; eager?: boolean }) {
  const photo = bio.photos[0];
  if (photo) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={photo} alt="" loading={eager ? "eager" : "lazy"} />;
  }
  if (bio.photosHidden) {
    return (
      <div className="locked-photo" aria-label="Photo shown after they accept or show interest">
        <Silhouette />
        <span><Icon name="lock" />Photo after interest</span>
      </div>
    );
  }
  return <Silhouette />;
}

export function ProfileCard({
  bio,
  saved,
  status,
  match,
  mutual,
  guna,
  online,
}: {
  bio: Biodata;
  saved: boolean;
  status: CardStatus;
  match?: number;
  mutual?: boolean;
  guna?: number | null;
  online?: boolean;
}) {
  const age = ageFrom(bio.dob);
  const height = bio.height?.replace(/\s*\(.*\)$/, "");
  return (
    <article className="pcard">
      <Link href={`/profile/${bio.userId}`} className="pcard-link">
        <div className="ph">
          <PhotoOrLock bio={bio} />
          {status !== "none" ? <span className={`${STATUS[status].cls} status`}>{STATUS[status].text}</span> : null}
          {bio.sample ? <span className="pill sample sample-tag">Sample profile</span> : online ? <span className="pill online-tag"><span className="online-dot" />Online</span> : null}
          {match !== undefined && match > 0 ? (
            <span className="pcard-ring">
              <Ring value={match} size={50} />
            </span>
          ) : null}
        </div>
        <div className="body">
          <span className="nm">
            {bio.fullName ?? "Unnamed"}
            {bio.verified ? <VerifiedTick /> : null}
          </span>
          <span className="meta">{[age !== null ? `${age} yrs` : null, height, bio.city].filter(Boolean).join(" · ")}</span>
          <span className="meta2">{[bio.occupation, bio.community || bio.caste].filter(Boolean).join(" · ")}</span>
          {mutual || (guna !== undefined && guna !== null) ? (
            <span className="chips mini">
              {mutual ? <span className="pill mutual"><Icon name="sparkle" />Mutual</span> : null}
              {guna !== undefined && guna !== null ? <span className={`pill guna-chip${guna >= 18 ? "" : " low"}`}><Icon name="moon" />{guna}/36</span> : null}
            </span>
          ) : null}
        </div>
      </Link>
      <SaveButton id={bio.userId} initial={saved} />
    </article>
  );
}

export function EmptyState({ title, text, action, icon = "search" }: { title: string; text: string; action?: React.ReactNode; icon?: string }) {
  return (
    <div className="empty card">
      <span className="empty-ico"><Icon name={icon} /></span>
      <h3>{title}</h3>
      <p>{text}</p>
      {action}
    </div>
  );
}
