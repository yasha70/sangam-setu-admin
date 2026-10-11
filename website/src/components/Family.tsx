"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Icon, Silhouette, VerifiedTick } from "./Icon";
import { send, toast } from "./Toaster";
import { FAMILY_REACTIONS, type FamilyReaction, type FamilyVote } from "@/lib/types";

export function FamilyLinkCard({ link, first }: { link: { token: string; expires: number } | null; first: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [origin, setOrigin] = useState("");
  useEffect(() => setOrigin(window.location.origin), []);
  const url = link ? `${origin}/f/${link.token}` : "";

  const act = async (action: "create" | "revoke") => {
    setBusy(true);
    try {
      await send("/api/family", "POST", { action });
      toast(action === "create" ? "New family link ready." : "Link switched off. The old link no longer works.");
      router.refresh();
    } catch (e) {
      toast((e as Error).message, true);
    } finally {
      setBusy(false);
    }
  };
  const msg = `Namaste! I've shortlisted a few rishtas on Sangam Setu. Please have a look and tell me what you think: ${url}`;

  return (
    <section className="card family-link">
      <div className="family-art" aria-hidden="true">
        <span>👵</span><span>👨</span><span>👩</span><span>🧑</span>
      </div>
      <div className="stack" style={{ gap: 10 }}>
        <h2>Ask the family</h2>
        <p className="muted">
          One private link shows your family the profiles you&apos;ve shortlisted, the people interested in you, and your connections.
          They can react ❤️ 👍 🤔 👎 and leave a comment, no account needed. Contact details and addresses are never shown.
        </p>
        {link ? (
          <>
            <div className="copy-row">
              <input className="input" readOnly value={url} aria-label="Family link" onFocus={(e) => e.currentTarget.select()} />
              <button
                className="btn btn-ghost btn-sm"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(url);
                    toast("Link copied.");
                  } catch {
                    toast("Couldn't copy. Select the link and copy it.", true);
                  }
                }}
              >
                <Icon name="copy" />
                Copy
              </button>
            </div>
            <div className="row">
              <a className="btn btn-whatsapp" href={`https://wa.me/?text=${encodeURIComponent(msg)}`} target="_blank" rel="noreferrer">
                <Icon name="share" />
                Share on WhatsApp
              </a>
              <button className="btn btn-quiet btn-sm" disabled={busy} onClick={() => act("create")}>New link</button>
              <button className="btn btn-quiet btn-sm btn-danger" disabled={busy} onClick={() => act("revoke")}>Switch off</button>
            </div>
            <small className="muted">
              Works until {new Date(link.expires).toLocaleDateString("en-IN", { day: "numeric", month: "long" })}. Anyone with the link can see {first}&apos;s list, so share it only with family.
            </small>
          </>
        ) : (
          <div className="row">
            <button className="btn btn-gold" disabled={busy} onClick={() => act("create")}>
              <Icon name="link" />
              Create family link
            </button>
          </div>
        )}
      </div>
    </section>
  );
}

export type ReviewItem = {
  id: string;
  name: string;
  age: number | null;
  facts: string[];
  about?: string;
  prompts: { q: string; a: string }[];
  photo: string | null;
  photoLocked: boolean;
  verified?: boolean;
  sample?: boolean;
  group: "shortlist" | "interested" | "connected";
  votes: FamilyVote[];
};

const GROUP_LABEL = { shortlist: "Shortlisted", interested: "Interested in them", connected: "Connected" };

export function VoteSummary({ votes }: { votes: FamilyVote[] }) {
  if (!votes.length) return <span className="muted small">No reactions yet</span>;
  return (
    <span className="vote-sum">
      {FAMILY_REACTIONS.map((r) => {
        const n = votes.filter((v) => v.reaction === r.id).length;
        return n ? (
          <span key={r.id} title={`${r.label}: ${votes.filter((v) => v.reaction === r.id).map((v) => v.name).join(", ")}`}>
            {r.emoji} {n}
          </span>
        ) : null;
      })}
    </span>
  );
}

export function VoteList({ votes }: { votes: FamilyVote[] }) {
  if (!votes.length) return null;
  return (
    <ul className="votes">
      {[...votes].sort((a, b) => b.ts - a.ts).map((v) => (
        <li key={v.name}>
          <span className="vote-emoji">{FAMILY_REACTIONS.find((r) => r.id === v.reaction)?.emoji}</span>
          <span>
            <b>{v.name}</b>
            {v.comment ? <> · {v.comment}</> : null}
          </span>
        </li>
      ))}
    </ul>
  );
}

/** The page family members open from the shared link. */
export function FamilyReview({ token, owner, items }: { token: string; owner: string; items: ReviewItem[] }) {
  const [name, setName] = useState("");
  const [draft, setDraft] = useState("");
  const [list, setList] = useState(items);
  const [comment, setComment] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    try {
      const n = localStorage.getItem("ss-family-name");
      if (n) setName(n);
    } catch {
      // private mode: ask each time
    }
  }, []);

  const saveName = () => {
    const n = draft.trim().slice(0, 30);
    if (!n) return;
    setName(n);
    try {
      localStorage.setItem("ss-family-name", n);
    } catch {
      // fine
    }
  };

  const react = async (id: string, reaction: FamilyReaction) => {
    if (!name) {
      toast("First tell us who you are, like Mummy or Chachu.", true);
      document.getElementById("who-input")?.focus();
      return;
    }
    setBusy(id);
    try {
      const res = await send<{ votes: FamilyVote[] }>(`/api/f/${token}`, "POST", { profile: id, name, reaction, comment: comment[id] });
      setList((cur) => cur.map((it) => (it.id === id ? { ...it, votes: res.votes } : it)));
      toast(`Thank you, ${name}. ${owner} will see your reaction.`);
    } catch (e) {
      toast((e as Error).message, true);
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="stack" style={{ gap: 20 }}>
      <section className="card who-card">
        {name ? (
          <div className="row">
            <span>
              Reviewing as <b>{name}</b>
            </span>
            <button className="btn btn-quiet btn-sm" onClick={() => { setDraft(name); setName(""); }}>Change</button>
          </div>
        ) : (
          <form
            className="row"
            onSubmit={(e) => {
              e.preventDefault();
              saveName();
            }}
          >
            <label htmlFor="who-input" style={{ fontWeight: 700 }}>Who&apos;s reviewing?</label>
            <input id="who-input" className="input" style={{ maxWidth: 260 }} value={draft} maxLength={30} onChange={(e) => setDraft(e.target.value)} placeholder="e.g. Mummy, Papa, Didi" />
            <button className="btn btn-brand btn-sm">Continue</button>
          </form>
        )}
      </section>

      {list.length ? (
        <div className="review-grid">
          {list.map((it) => {
            const mine = list.find((x) => x.id === it.id)?.votes.find((v) => v.name.toLowerCase() === name.toLowerCase());
            return (
              <article key={it.id} className="review-card card">
                <div className="review-photo">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {it.photo ? <img src={it.photo} alt="" /> : (
                    <div className="locked-photo">
                      <Silhouette />
                      {it.photoLocked ? <span><Icon name="lock" />Photo is private</span> : null}
                    </div>
                  )}
                  <span className="pill review-group">{GROUP_LABEL[it.group]}</span>
                  {it.sample ? <span className="pill sample sample-tag">Sample profile</span> : null}
                </div>
                <div className="review-body">
                  <h3>
                    {it.name}
                    {it.age !== null ? `, ${it.age}` : ""}
                    {it.verified ? <VerifiedTick /> : null}
                  </h3>
                  <div className="chips">
                    {it.facts.map((f) => (
                      <span key={f} className="pill">{f}</span>
                    ))}
                  </div>
                  {it.about ? <p className="prose small">{it.about}</p> : null}
                  {it.prompts.slice(0, 2).map((p) => (
                    <div key={p.q} className="dprompt">
                      <small>{p.q}</small>
                      <p>{p.a}</p>
                    </div>
                  ))}
                  <div className="react-row" role="group" aria-label={`React to ${it.name}`}>
                    {FAMILY_REACTIONS.map((r) => (
                      <button key={r.id} type="button" className="react-btn" aria-pressed={mine?.reaction === r.id} disabled={busy === it.id} onClick={() => react(it.id, r.id)}>
                        <span>{r.emoji}</span>
                        {r.label}
                      </button>
                    ))}
                  </div>
                  <input
                    className="input"
                    placeholder="Add a comment (optional), then tap a reaction"
                    maxLength={200}
                    value={comment[it.id] ?? ""}
                    onChange={(e) => setComment((c) => ({ ...c, [it.id]: e.target.value }))}
                  />
                  <VoteList votes={it.votes} />
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="card empty">
          <h3>Nothing to review yet</h3>
          <p>{owner} hasn&apos;t shortlisted anyone yet. Check back soon.</p>
        </div>
      )}
    </div>
  );
}
