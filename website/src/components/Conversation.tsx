"use client";

import Link from "next/link";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Icon, Silhouette } from "./Icon";
import { send, toast } from "./Toaster";
import { MEET_MODES, type MeetMode, type MeetStatus, type Message } from "@/lib/types";

const MODE_ICON: Record<MeetMode, string> = { "Video call": "video", "Phone call": "phone", "Coffee meet": "coffee", "Family visit": "family" };

function fmtWhen(iso: string) {
  return new Date(iso).toLocaleString("en-IN", { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
}

function calendarLink(m: NonNullable<Message["meet"]>, other: string) {
  const start = new Date(m.when);
  const end = new Date(start.getTime() + 60 * 60_000);
  const f = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const p = new URLSearchParams({
    action: "TEMPLATE",
    text: `${m.mode} with ${other} · Sangam Setu`,
    dates: `${f(start)}/${f(end)}`,
    details: "Planned on Sangam Setu.",
    location: m.place ?? "",
  });
  return `https://calendar.google.com/calendar/render?${p.toString()}`;
}

type Msg = Message & { pending?: boolean };

function dayLabel(ts: number) {
  const d = new Date(ts);
  const today = new Date(new Date().toDateString()).getTime();
  const day = new Date(d.toDateString()).getTime();
  if (day === today) return "Today";
  if (today - day === 86400000) return "Yesterday";
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
}

export function Conversation({
  me,
  other,
  initial,
  initialRead,
  initialMeets = {},
  starters = [],
}: {
  me: string;
  other: { id: string; name: string; photo: string | null; line: string };
  initial: Message[];
  initialRead: number;
  initialMeets?: Record<string, MeetStatus>;
  starters?: string[];
}) {
  const [messages, setMessages] = useState<Msg[]>(initial);
  const [theirRead, setTheirRead] = useState(initialRead);
  const [text, setText] = useState("");
  const [online, setOnline] = useState(true);
  const [typing, setTyping] = useState(false);
  const [meets, setMeets] = useState(initialMeets);
  const [planning, setPlanning] = useState(false);
  const lastTypingPing = useRef(0);
  const first = other.name.split(" ")[0];
  const body = useRef<HTMLDivElement>(null);
  const box = useRef<HTMLTextAreaElement>(null);
  const stick = useRef(true);
  const lastTs = useRef(initial.length ? initial[initial.length - 1].ts : 0);

  const merge = useCallback((incoming: Message[]) => {
    if (!incoming.length) return;
    setMessages((cur) => {
      const ids = new Set(cur.map((m) => m.id));
      const add = incoming.filter((m) => !ids.has(m.id));
      if (!add.length) return cur;
      return [...cur.filter((m) => !m.pending || !add.some((a) => a.from === me && a.text === m.text)), ...add].sort((a, b) => a.ts - b.ts);
    });
    lastTs.current = Math.max(lastTs.current, ...incoming.map((m) => m.ts));
  }, [me]);

  // Live updates: poll for new messages every 1.5 seconds while the tab is visible.
  useEffect(() => {
    let stop = false;
    let timer: ReturnType<typeof setTimeout>;
    const tick = async () => {
      if (!document.hidden) {
        try {
          const res = await fetch(`/api/chat/${other.id}?after=${lastTs.current}`, { cache: "no-store" });
          if (res.ok) {
            const data = (await res.json()) as { messages: Message[]; theirRead: number; typing?: boolean; meets?: Record<string, MeetStatus> };
            if (!stop) {
              merge(data.messages);
              setTheirRead(data.theirRead);
              setTyping(Boolean(data.typing));
              if (data.meets) setMeets(data.meets);
              setOnline(true);
            }
          } else if (res.status === 403) {
            stop = true;
            toast("This chat is no longer available.", true);
          }
        } catch {
          setOnline(false);
        }
      }
      if (!stop) timer = setTimeout(tick, 1500);
    };
    timer = setTimeout(tick, 1500);
    const wake = () => {
      if (!document.hidden) {
        clearTimeout(timer);
        tick();
      }
    };
    document.addEventListener("visibilitychange", wake);
    return () => {
      stop = true;
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", wake);
    };
  }, [other.id, merge]);

  useLayoutEffect(() => {
    const el = body.current;
    if (el && stick.current) el.scrollTop = el.scrollHeight;
  }, [messages]);

  const onScroll = () => {
    const el = body.current;
    if (el) stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
  };

  const pingTyping = () => {
    const now = Date.now();
    if (now - lastTypingPing.current < 3000) return;
    lastTypingPing.current = now;
    fetch(`/api/chat/${other.id}/typing`, { method: "POST" }).catch(() => {});
  };

  async function respond(mid: string, accept: boolean) {
    try {
      const res = await send<{ message: Message }>(`/api/chat/${other.id}/meet`, "POST", { mid, accept });
      setMeets((m) => ({ ...m, [mid]: accept ? "accepted" : "declined" }));
      stick.current = true;
      merge([res.message]);
    } catch (e) {
      toast((e as Error).message, true);
    }
  }

  async function propose(meet: { when: string; mode: MeetMode; place?: string }) {
    try {
      const res = await send<{ message: Message }>(`/api/chat/${other.id}`, "POST", { kind: "meet", meet });
      setMeets((m) => ({ ...m, [res.message.id]: "proposed" }));
      stick.current = true;
      merge([res.message]);
      setPlanning(false);
      toast(`Sent to ${first}. You'll see their answer here.`);
    } catch (e) {
      toast((e as Error).message, true);
    }
  }

  async function submit(preset?: string) {
    const t = (preset ?? text).trim();
    if (!t) return;
    const temp: Msg = { id: `tmp-${Date.now()}`, from: me, text: t, ts: Date.now(), pending: true };
    stick.current = true;
    setMessages((cur) => [...cur, temp]);
    if (!preset) setText("");
    box.current?.focus();
    try {
      const res = await fetch(`/api/chat/${other.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: t }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Message not sent.");
      const msg = data.message as Message;
      setMessages((cur) => cur.map((m) => (m.id === temp.id ? msg : m)));
      lastTs.current = Math.max(lastTs.current, msg.ts);
    } catch (e) {
      setMessages((cur) => cur.filter((m) => m.id !== temp.id));
      if (!preset) setText(t);
      toast((e as Error).message, true);
    }
  }

  let lastDay = "";
  return (
    <section className="convo" aria-label={`Chat with ${other.name}`}>
      <div className="convo-head">
        <Link className="icon-btn" href="/chat" aria-label="All chats">
          <Icon name="back" />
        </Link>
        <Link className="who" href={`/profile/${other.id}`}>
          <span className="avatar sm">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {other.photo ? <img src={other.photo} alt="" /> : <Silhouette />}
          </span>
          <span style={{ minWidth: 0 }}>
            <b>{other.name}</b>
            <span>{!online ? "Reconnecting…" : typing ? "typing…" : other.line}</span>
          </span>
        </Link>
        <Link className="btn btn-quiet btn-sm" href={`/profile/${other.id}`}>
          <Icon name="doc" />
          Biodata
        </Link>
      </div>

      <div className="convo-body" ref={body} onScroll={onScroll} aria-live="polite">
        <span className="chip-date" style={{ maxWidth: 420, textAlign: "center" }}>
          <Icon name="lock" className="ico" /> You&apos;re connected. Be respectful, and keep money and personal documents out of chat.
        </span>
        {messages.map((m, i) => {
          const day = dayLabel(m.ts);
          const showDay = day !== lastDay;
          lastDay = day;
          const mine = m.from === me;
          const prev = messages[i - 1];
          const cont = !showDay && prev && prev.from === m.from && m.ts - prev.ts < 5 * 60 * 1000;
          const read = mine && !m.pending && theirRead >= m.ts;
          return (
            <div key={m.id} style={{ display: "contents" }}>
              {showDay ? <span className="chip-date">{day}</span> : null}
              {m.kind === "meet" && m.meet ? (
                <MeetCard m={m} mine={mine} status={meets[m.id] ?? "proposed"} other={first} onRespond={(a) => respond(m.id, a)} />
              ) : (
              <div className={`msg ${mine ? "out" : "in"}${cont ? " cont" : ""}${m.pending ? " pending" : ""}${m.kind === "note" ? " note" : ""}`}>
                {m.kind === "note" ? (
                  <span className="note-head">
                    <Icon name="heart" />
                    {mine ? "Your note with the interest" : `${first}'s note with the interest`}
                    {m.quote ? <q>{m.quote}</q> : null}
                  </span>
                ) : null}
                {m.text}
                <span className="time">
                  {new Date(m.ts).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" })}
                  {mine ? (
                    m.pending ? (
                      <Icon name="clock" />
                    ) : (
                      <Icon name={read ? "dtick" : "check"} className={`ico${read ? " read" : ""}`} title={read ? "Read" : "Sent"} />
                    )
                  ) : null}
                </span>
              </div>
              )}
            </div>
          );
        })}
        {typing ? (
          <div className="msg in typing-bubble" aria-label={`${first} is typing`}>
            <i /><i /><i />
          </div>
        ) : null}
        {messages.filter((m) => m.kind !== "note").length === 0 && starters.length ? (
          <div className="starters">
            <span className="chip-date">Not sure how to begin? Tap one to send it.</span>
            {starters.map((st) => (
              <button key={st} type="button" className="chip-btn" onClick={() => submit(st)}>
                {st}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      {planning ? <PlanForm first={first} onCancel={() => setPlanning(false)} onSend={propose} /> : null}

      <form
        className="composer"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <button type="button" className="icon-btn plan-btn" aria-label="Plan a call or meeting" title="Plan a call or meeting" aria-expanded={planning} onClick={() => setPlanning(!planning)}>
          <Icon name="calendar" />
        </button>
        <label htmlFor="composer" className="sr-only">Message</label>
        <textarea
          id="composer"
          ref={box}
          rows={1}
          value={text}
          maxLength={2000}
          placeholder="Message"
          onChange={(e) => {
            setText(e.target.value);
            if (e.target.value) pingTyping();
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault();
              submit();
            }
          }}
        />
        <button className="send" aria-label="Send" disabled={!text.trim()}>
          <Icon name="send" />
        </button>
      </form>
    </section>
  );
}

function MeetCard({ m, mine, status, other, onRespond }: { m: Message; mine: boolean; status: MeetStatus; other: string; onRespond: (accept: boolean) => void }) {
  const meet = m.meet!;
  const past = new Date(meet.when).getTime() < Date.now();
  return (
    <div className={`meet-card ${mine ? "out" : "in"}`} data-status={status}>
      <span className="meet-ico"><Icon name={MODE_ICON[meet.mode] ?? "calendar"} /></span>
      <div className="meet-info">
        <small>{mine ? "You proposed" : `${other} proposed`}</small>
        <b>{meet.mode}</b>
        <span>{fmtWhen(meet.when)}{meet.place ? ` · ${meet.place}` : ""}</span>
      </div>
      <div className="meet-act">
        {status === "accepted" ? (
          <>
            <span className="pill ok"><Icon name="check" />Confirmed</span>
            {!past ? <a className="btn btn-quiet btn-sm" href={calendarLink(meet, other)} target="_blank" rel="noreferrer">Add to calendar</a> : null}
          </>
        ) : status === "declined" ? (
          <span className="pill">Not this time</span>
        ) : mine ? (
          <span className="pill gold">Waiting for {other}</span>
        ) : past ? (
          <span className="pill">Time has passed</span>
        ) : (
          <>
            <button className="btn btn-brand btn-sm" onClick={() => onRespond(true)}>Accept</button>
            <button className="btn btn-ghost btn-sm" onClick={() => onRespond(false)}>Can&apos;t make it</button>
          </>
        )}
      </div>
    </div>
  );
}

function PlanForm({ first, onCancel, onSend }: { first: string; onCancel: () => void; onSend: (m: { when: string; mode: MeetMode; place?: string }) => void }) {
  const [mode, setMode] = useState<MeetMode>("Video call");
  const [when, setWhen] = useState(() => {
    const d = new Date(Date.now() + 2 * 86400_000);
    d.setHours(18, 0, 0, 0);
    return new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
  });
  const [place, setPlace] = useState("");
  return (
    <form
      className="plan-form"
      onSubmit={(e) => {
        e.preventDefault();
        onSend({ mode, when: new Date(when).toISOString(), place: place.trim() || undefined });
      }}
    >
      <b>Plan something with {first}</b>
      <div className="multi">
        {MEET_MODES.map((m) => (
          <button key={m} type="button" aria-pressed={mode === m} onClick={() => setMode(m)}>
            <Icon name={MODE_ICON[m]} />
            {m}
          </button>
        ))}
      </div>
      <div className="row">
        <label className="field" style={{ flex: "1 1 200px" }}>
          <span>When</span>
          <input type="datetime-local" className="input" value={when} onChange={(e) => setWhen(e.target.value)} required />
        </label>
        <label className="field" style={{ flex: "1 1 200px" }}>
          <span>{mode === "Coffee meet" || mode === "Family visit" ? "Where" : "Note (optional)"}</span>
          <input className="input" value={place} maxLength={120} onChange={(e) => setPlace(e.target.value)} placeholder={mode === "Family visit" ? "e.g. Our home in Vijay Nagar" : mode === "Coffee meet" ? "e.g. Indian Coffee House" : "e.g. Google Meet link to follow"} />
        </label>
      </div>
      <div className="row" style={{ justifyContent: "flex-end" }}>
        <button type="button" className="btn btn-quiet btn-sm" onClick={onCancel}>Cancel</button>
        <button className="btn btn-brand btn-sm">
          <Icon name="send" />
          Propose
        </button>
      </div>
    </form>
  );
}
