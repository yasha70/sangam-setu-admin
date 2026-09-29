"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Silhouette } from "./Icon";
import type { ChatSummary } from "@/lib/data";

export function timeLabel(ts: number) {
  const d = new Date(ts);
  const now = new Date();
  const days = Math.floor((new Date(now.toDateString()).getTime() - new Date(d.toDateString()).getTime()) / 86400000);
  if (days === 0) return d.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" });
  if (days === 1) return "Yesterday";
  if (days < 7) return d.toLocaleDateString("en-IN", { weekday: "short" });
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

export function ChatList({ initial, activeId }: { initial: ChatSummary[]; activeId?: string }) {
  const [chats, setChats] = useState(initial);

  useEffect(() => {
    let stop = false;
    const load = async () => {
      if (document.hidden) return;
      try {
        const res = await fetch("/api/chats", { cache: "no-store" });
        if (res.ok && !stop) setChats((await res.json()).chats);
      } catch {
        // keep the list we have
      }
    };
    const t = setInterval(load, 5000);
    return () => {
      stop = true;
      clearInterval(t);
    };
  }, []);

  return (
    <aside className="chat-side" aria-label="Conversations">
      <header>
        <h1>Chats</h1>
        <p className="muted small">Chat opens when an interest is accepted.</p>
      </header>
      <div className="chat-items">
        {chats.length ? (
          chats.map((c) => {
            const unread = c.id !== activeId && c.unread > 0;
            return (
              <Link key={c.id} className="chat-item" href={`/chat/${c.id}`} aria-current={c.id === activeId ? "page" : undefined}>
                <span className="avatar sm">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {c.photo ? <img src={c.photo} alt="" /> : <Silhouette />}
                </span>
                <span className="txt">
                  <b>{c.name}</b>
                  <span>{c.last ? `${c.last.mine ? "You: " : ""}${c.last.text}` : "Say namaste 👋"}</span>
                </span>
                <span className={`end${unread ? " unread" : ""}`}>
                  {c.last ? timeLabel(c.last.ts) : ""}
                  {unread ? <span className="badge">{c.unread}</span> : null}
                </span>
              </Link>
            );
          })
        ) : (
          <div className="empty" style={{ padding: "32px 18px" }}>
            <p>No connections yet. When an interest is accepted, the chat appears here.</p>
            <Link className="btn btn-ghost btn-sm" href="/browse">Browse profiles</Link>
          </div>
        )}
      </div>
    </aside>
  );
}
