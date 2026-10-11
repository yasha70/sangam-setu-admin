"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { Icon, Silhouette, VerifiedTick } from "./Icon";
import { openInterest, quickInterest } from "./Interest";
import { send, toast } from "./Toaster";

export type DeckItem = {
  id: string;
  name: string;
  age: number | null;
  height?: string;
  place: string;
  occupation?: string;
  education?: string;
  community?: string;
  religion?: string;
  photos: string[];
  photosHidden?: number;
  verified?: boolean;
  sample?: boolean;
  online?: boolean;
  match: number;
  reasons: { label: string; ok: boolean | null }[];
  mutual: boolean;
  guna: number | null;
  prompt?: { q: string; a: string };
  about?: string;
  common: string[];
};

type Action = "pass" | "save" | "interest";

export function DiscoverDeck({ items, published }: { items: DeckItem[]; published: boolean }) {
  const router = useRouter();
  const [i, setI] = useState(0);
  const [photo, setPhoto] = useState(0);
  const [drag, setDrag] = useState({ x: 0, y: 0, active: false });
  const [leaving, setLeaving] = useState<null | "left" | "right" | "up">(null);
  const [history, setHistory] = useState<{ index: number; action: Action }[]>([]);
  const start = useRef<{ x: number; y: number; t: number } | null>(null);
  const card = items[i];
  const next = items[i + 1];

  useEffect(() => setPhoto(0), [i]);

  const advance = useCallback((dir: "left" | "right" | "up", action: Action) => {
    setLeaving(dir);
    setHistory((h) => [...h.slice(-20), { index: i, action }]);
    window.setTimeout(() => {
      setLeaving(null);
      setDrag({ x: 0, y: 0, active: false });
      setI((n) => n + 1);
    }, 260);
  }, [i]);

  const act = useCallback(
    async (action: Action, quick = false) => {
      if (!card || leaving) return;
      if (action === "pass") {
        advance("left", "pass");
        send("/api/pass", "POST", { id: card.id }).catch(() => {});
        return;
      }
      if (action === "save") {
        advance("up", "save");
        try {
          await send("/api/saved", "POST", { id: card.id, saved: true });
          toast(`${card.name.split(" ")[0]} is on your shortlist.`);
        } catch (e) {
          toast((e as Error).message, true);
        }
        return;
      }
      if (card.sample) {
        toast("Sample profiles can't receive interests. Save it, or pass to see the next one.");
        setDrag({ x: 0, y: 0, active: false });
        return;
      }
      if (!published) {
        toast("Publish your biodata first, so they can see who's interested.", true);
        setDrag({ x: 0, y: 0, active: false });
        return;
      }
      if (!quick) {
        setDrag({ x: 0, y: 0, active: false });
        openInterest({ id: card.id, name: card.name, photo: card.photos[0] });
        return;
      }
      advance("right", "interest");
      try {
        await quickInterest({ id: card.id, name: card.name, photo: card.photos[0] });
      } catch (e) {
        toast((e as Error).message, true);
      }
    },
    [card, leaving, advance, published],
  );

  // The note sheet reports back: move on once the interest went through.
  useEffect(() => {
    const on = (e: Event) => {
      const d = (e as CustomEvent<{ id: string; result: string }>).detail;
      if (card && d.id === card.id && !leaving) advance("right", "interest");
    };
    window.addEventListener("sangam-interest-done", on);
    return () => window.removeEventListener("sangam-interest-done", on);
  }, [card, leaving, advance]);

  const undo = async () => {
    const last = history[history.length - 1];
    if (!last || last.action !== "pass") return;
    setHistory((h) => h.slice(0, -1));
    setI(last.index);
    await send("/api/pass", "POST", { id: items[last.index].id, undo: true }).catch(() => {});
  };

  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.closest("input, textarea, select, dialog")) return;
      if (e.key === "ArrowLeft") act("pass");
      else if (e.key === "ArrowRight") act("interest", true);
      else if (e.key === "ArrowUp" || e.key.toLowerCase() === "s") act("save");
      else if (e.key.toLowerCase() === "z") undo();
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  });

  if (!card) {
    return (
      <div className="deck-done card">
        <span className="empty-ico"><Icon name="sparkle" /></span>
        <h2>That&apos;s everyone for now</h2>
        <p className="muted">You&apos;ve seen every new profile that fits. New families join every day, and passed profiles come back after 30 days.</p>
        <div className="row" style={{ justifyContent: "center" }}>
          <Link className="btn btn-brand" href="/browse">Search all profiles</Link>
          <Link className="btn btn-ghost" href="/biodata/edit#prefs">Widen preferences</Link>
          {history.some((h) => h.action === "pass") ? (
            <button className="btn btn-quiet" onClick={undo}><Icon name="undo" />Undo last pass</button>
          ) : null}
        </div>
      </div>
    );
  }

  const rot = drag.x / 18;
  const style = leaving
    ? undefined
    : { transform: `translate(${drag.x}px, ${drag.y * 0.3}px) rotate(${rot}deg)`, transition: drag.active ? "none" : undefined };
  const tilt = Math.max(-1, Math.min(1, drag.x / 120));
  const photos = card.photos;

  return (
    <div className="deck-wrap">
      <div className="deck-progress" aria-live="polite">
        <span>{i + 1} of {items.length}</span>
        <span className="bar"><i style={{ width: `${((i + 1) / items.length) * 100}%` }} /></span>
      </div>
      <div className="deck">
        {next ? (
          <div className="dcard behind" aria-hidden="true">
            <div className="dphoto">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {next.photos[0] ? <img src={next.photos[0]} alt="" /> : <Silhouette />}
            </div>
          </div>
        ) : null}
        <article
          key={card.id}
          className={`dcard${leaving ? ` leave-${leaving}` : ""}`}
          style={style}
          aria-label={`${card.name}, ${card.age ?? ""}`}
          onPointerDown={(e) => {
            if ((e.target as HTMLElement).closest("a, button")) return;
            start.current = { x: e.clientX, y: e.clientY, t: Date.now() };
            (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
            setDrag({ x: 0, y: 0, active: true });
          }}
          onPointerMove={(e) => {
            if (!start.current) return;
            setDrag({ x: e.clientX - start.current.x, y: e.clientY - start.current.y, active: true });
          }}
          onPointerUp={(e) => {
            const s = start.current;
            start.current = null;
            if (!s) return;
            const dx = e.clientX - s.x;
            const dy = e.clientY - s.y;
            if (dx > 110) return act("interest", true);
            if (dx < -110) return act("pass");
            if (dy < -120) return act("save");
            setDrag({ x: 0, y: 0, active: false });
            // A tap (not a drag) on the photo flips through photos
            if (Math.abs(dx) < 6 && Math.abs(dy) < 6 && Date.now() - s.t < 350 && photos.length > 1) {
              const el = e.currentTarget.querySelector(".dphoto")?.getBoundingClientRect();
              if (el && e.clientY < el.bottom) setPhoto((p) => (e.clientX - el.left > el.width / 2 ? Math.min(photos.length - 1, p + 1) : Math.max(0, p - 1)));
            }
          }}
          onPointerCancel={() => {
            start.current = null;
            setDrag({ x: 0, y: 0, active: false });
          }}
        >
          <div className="dphoto">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {photos[photo] ? <img src={photos[photo]} alt={card.name} draggable={false} /> : card.photosHidden ? (
              <div className="locked-photo"><Silhouette /><span><Icon name="lock" />Photos shown after interest</span></div>
            ) : <Silhouette />}
            {photos.length > 1 ? (
              <span className="dots" aria-hidden="true">
                {photos.map((p, n) => (
                  <i key={p} data-on={n === photo ? "true" : undefined} />
                ))}
              </span>
            ) : null}
            <span className="stamp stamp-yes" style={{ opacity: Math.max(0, tilt) }}>Interested</span>
            <span className="stamp stamp-no" style={{ opacity: Math.max(0, -tilt) }}>Pass</span>
            <div className="dshade">
              <div className="dbadges">
                <span className="match-badge"><b>{card.match}%</b> match</span>
                {card.mutual ? <span className="pill mutual"><Icon name="sparkle" />Mutual</span> : null}
                {card.guna !== null ? <span className="pill guna-chip"><Icon name="moon" />Guna {card.guna}/36</span> : null}
                {card.sample ? <span className="pill sample">Sample profile</span> : null}
                {card.online ? <span className="pill online-tag"><span className="online-dot" />Online</span> : null}
              </div>
              <h2>
                <span>
                  {card.name}
                  {card.age !== null ? <small>, {card.age}</small> : null}
                </span>
                {card.verified ? <VerifiedTick /> : null}
              </h2>
              <p>{[card.occupation, card.place].filter(Boolean).join(" · ")}</p>
            </div>
          </div>
          <div className="dbody">
            <div className="chips">
              {[card.height, card.education, card.community, card.religion].filter(Boolean).map((x) => (
                <span key={x} className="pill">{x}</span>
              ))}
            </div>
            {card.prompt ? (
              <div className="dprompt">
                <small>{card.prompt.q}</small>
                <p>{card.prompt.a}</p>
              </div>
            ) : card.about ? (
              <p className="dabout">{card.about}</p>
            ) : null}
            {card.reasons.length ? (
              <ul className="dreasons">
                {card.reasons.map((r) => (
                  <li key={r.label} data-ok={r.ok === null ? "unknown" : String(r.ok)}>{r.ok === null ? "?" : r.ok ? "✓" : "✕"} {r.label}</li>
                ))}
              </ul>
            ) : null}
            {card.common.length ? <p className="dcommon"><Icon name="sparkle" />{card.common.slice(0, 2).join(" · ")}</p> : null}
            <Link className="dmore" href={`/profile/${card.id}`}>
              Full biodata
              <Icon name="chevron" />
            </Link>
          </div>
        </article>
      </div>

      <div className="deck-actions">
        <button className="dbtn undo" onClick={undo} disabled={history[history.length - 1]?.action !== "pass"} aria-label="Undo last pass" title="Undo (Z)">
          <Icon name="undo" />
        </button>
        <button className="dbtn pass" onClick={() => act("pass")} aria-label="Pass" title="Pass (←)">
          <Icon name="x" />
        </button>
        <button className="dbtn love" onClick={() => act("interest")} aria-label="Send interest with a note" title="Send interest (→ to send without a note)" disabled={card.sample}>
          <Icon name="heart" />
        </button>
        <button className="dbtn save" onClick={() => act("save")} aria-label="Save to shortlist" title="Shortlist (↑)">
          <Icon name="bookmark" />
        </button>
        <button className="dbtn more" onClick={() => router.push(`/profile/${card.id}`)} aria-label="Open full biodata" title="Full biodata">
          <Icon name="doc" />
        </button>
      </div>
      <p className="deck-hint muted small">Swipe or use ← pass · → interest · ↑ shortlist · Z undo</p>
    </div>
  );
}
