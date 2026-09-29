"use client";

import Link from "next/link";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Icon, Silhouette } from "./Icon";
import { toast } from "./Toaster";
import type { Message } from "@/lib/types";

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
}: {
  me: string;
  other: { id: string; name: string; photo: string | null; line: string };
  initial: Message[];
  initialRead: number;
}) {
  const [messages, setMessages] = useState<Msg[]>(initial);
  const [theirRead, setTheirRead] = useState(initialRead);
  const [text, setText] = useState("");
  const [online, setOnline] = useState(true);
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
            const data = (await res.json()) as { messages: Message[]; theirRead: number };
            if (!stop) {
              merge(data.messages);
              setTheirRead(data.theirRead);
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

  async function submit() {
    const t = text.trim();
    if (!t) return;
    const temp: Msg = { id: `tmp-${Date.now()}`, from: me, text: t, ts: Date.now(), pending: true };
    stick.current = true;
    setMessages((cur) => [...cur, temp]);
    setText("");
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
      setText(t);
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
            <span>{online ? other.line : "Reconnecting…"}</span>
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
              <div className={`msg ${mine ? "out" : "in"}${cont ? " cont" : ""}${m.pending ? " pending" : ""}`}>
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
            </div>
          );
        })}
      </div>

      <form
        className="composer"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <label htmlFor="composer" className="sr-only">Message</label>
        <textarea
          id="composer"
          ref={box}
          rows={1}
          value={text}
          maxLength={2000}
          placeholder="Message"
          onChange={(e) => setText(e.target.value)}
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
