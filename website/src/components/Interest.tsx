"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { Icon, Lotus, Silhouette } from "./Icon";
import { send, toast } from "./Toaster";

export type InterestTarget = { id: string; name: string; photo?: string | null; liked?: string };
type Person = { id: string; name: string; photo?: string | null };

/** Opens the "send interest" sheet from anywhere: profile buttons, prompt likes, the Discover deck. */
export function openInterest(t: InterestTarget) {
  window.dispatchEvent(new CustomEvent("sangam-interest", { detail: t }));
}

/** Shows the "Rishta jud gaya" moment for a new connection. */
export function celebrate(p: Person) {
  window.dispatchEvent(new CustomEvent("sangam-celebrate", { detail: p }));
}

/** Tells listening components (the deck, profile actions) how an interest went. */
function announce(id: string, result: string) {
  window.dispatchEvent(new CustomEvent("sangam-interest-done", { detail: { id, result } }));
}

export async function quickInterest(t: InterestTarget, router?: ReturnType<typeof useRouter>) {
  const res = await send<{ result: string }>("/api/interests", "POST", { id: t.id, action: "send" });
  if (res.result === "connected") celebrate(t);
  else toast(`Interest sent to ${t.name.split(" ")[0]}.`);
  announce(t.id, res.result);
  router?.refresh();
  return res.result;
}

export function InterestSheet() {
  const router = useRouter();
  const dialog = useRef<HTMLDialogElement>(null);
  const [t, setT] = useState<InterestTarget | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const on = (e: Event) => {
      const d = (e as CustomEvent<InterestTarget>).detail;
      setT(d);
      setNote("");
      dialog.current?.showModal();
    };
    window.addEventListener("sangam-interest", on);
    return () => window.removeEventListener("sangam-interest", on);
  }, []);

  const first = t?.name.split(" ")[0] ?? "";
  const ideas = useMemo(
    () =>
      t?.liked
        ? [`I loved this answer, ${first}! Tell me more?`, "This made me smile. We seem to think alike.", `Namaste ${first}, your answer says a lot about you. Would love to talk.`]
        : [`Namaste ${first}! Your profile felt warm and genuine. Would love to know you better.`, "Our families seem to share a lot. Would you like to talk?", `Hi ${first}, I'd love to connect with you and your family.`],
    [t?.liked, first],
  );

  async function submit() {
    if (!t) return;
    setBusy(true);
    try {
      const res = await send<{ result: string }>("/api/interests", "POST", { id: t.id, action: "send", note: note.trim() || undefined, liked: t.liked });
      dialog.current?.close();
      if (res.result === "connected") celebrate(t);
      else if (res.result === "sent") toast(`Interest sent to ${first}. You'll be able to chat once they accept.`);
      else toast("You've already sent an interest.");
      announce(t.id, res.result);
      router.refresh();
    } catch (e) {
      toast((e as Error).message, true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <dialog ref={dialog} className="sheet interest-sheet" aria-labelledby="interest-title" onClose={() => setT(null)}>
      {t ? (
        <form
          method="dialog"
          className="stack"
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <div className="row" style={{ gap: 14, flexWrap: "nowrap" }}>
            <span className="avatar">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {t.photo ? <img src={t.photo} alt="" /> : <Silhouette />}
            </span>
            <div style={{ minWidth: 0 }}>
              <h2 id="interest-title">Send interest to {first}</h2>
              <p className="muted small">Add a note so they know what caught your eye. Notes get far more replies.</p>
            </div>
          </div>
          {t.liked ? (
            <blockquote className="liked-quote">
              <Icon name="heart" />
              <span>{t.liked}</span>
            </blockquote>
          ) : null}
          <label className="field">
            <span>Your note (optional)</span>
            <textarea value={note} maxLength={300} onChange={(e) => setNote(e.target.value)} placeholder={`Write something kind to ${first}…`} autoFocus />
            <small>{300 - note.length} characters left. It becomes your first message once they accept.</small>
          </label>
          <div className="chips">
            {ideas.map((i) => (
              <button type="button" key={i} className="chip-btn" onClick={() => setNote(i)}>
                {i}
              </button>
            ))}
          </div>
          <div className="row" style={{ justifyContent: "flex-end" }}>
            <button type="button" className="btn btn-quiet" onClick={() => dialog.current?.close()}>Cancel</button>
            <button className="btn btn-brand" disabled={busy}>
              <Icon name="heart" />
              {busy ? "Sending…" : note.trim() ? "Send with note" : "Send interest"}
            </button>
          </div>
        </form>
      ) : null}
    </dialog>
  );
}

const PETALS = Array.from({ length: 26 }, (_, i) => ({
  left: (i * 37) % 100,
  delay: (i % 9) * 0.35,
  dur: 4.2 + ((i * 13) % 10) / 4,
  hue: ["#f28c0f", "#ffc34d", "#e0306f", "#ff8fb1", "#f6b21b"][i % 5],
  size: 10 + ((i * 7) % 9),
}));

export function Celebrate({ me }: { me: { name: string; photo: string | null } }) {
  const [p, setP] = useState<Person | null>(null);
  useEffect(() => {
    const on = (e: Event) => setP((e as CustomEvent<Person>).detail);
    window.addEventListener("sangam-celebrate", on);
    return () => window.removeEventListener("sangam-celebrate", on);
  }, []);
  useEffect(() => {
    if (!p) return;
    const key = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  });

  function close() {
    if (p) fetch("/api/celebrate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: p.id }) }).catch(() => {});
    setP(null);
  }
  if (!p) return null;
  const first = p.name.split(" ")[0];
  return (
    <div className="celebrate" role="dialog" aria-modal="true" aria-labelledby="celebrate-title">
      <div className="petals" aria-hidden="true">
        {PETALS.map((x, i) => (
          <i key={i} style={{ left: `${x.left}%`, animationDelay: `${x.delay}s`, animationDuration: `${x.dur}s`, background: x.hue, width: x.size, height: x.size * 0.7 }} />
        ))}
      </div>
      <div className="celebrate-card">
        <Lotus className="celebrate-lotus" />
        <div className="setu" aria-hidden="true">
          <span className="avatar xl">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {me.photo ? <img src={me.photo} alt="" /> : <Silhouette />}
          </span>
          <svg viewBox="0 0 160 60" className="bridge">
            <path d="M4 52 Q80 -14 156 52" />
            <path d="M4 52 Q80 -14 156 52" className="bridge-glow" />
          </svg>
          <span className="avatar xl">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {p.photo ? <img src={p.photo} alt="" /> : <Silhouette />}
          </span>
        </div>
        <p className="eyebrow">Sangam!</p>
        <h2 id="celebrate-title">Rishta jud gaya</h2>
        <p className="muted">You and {first} both said yes. Contact details are now visible to both of you, and your chat is open.</p>
        <div className="row" style={{ justifyContent: "center" }}>
          <Link className="btn btn-brand" href={`/chat/${p.id}`} onClick={close}>
            <Icon name="chat" />
            Say namaste to {first}
          </Link>
          <button className="btn btn-ghost" onClick={close}>Keep exploring</button>
        </div>
      </div>
    </div>
  );
}
