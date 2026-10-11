"use client";

import Link from "next/link";
import { Icon, Silhouette } from "./Icon";
import { useInterestAction } from "./ProfileActions";

export type RowData = {
  id: string;
  name: string;
  photo?: string;
  line: string;
  mode: "received" | "sent" | "sent-declined" | "connected" | "saved";
  note?: string;
  liked?: string;
  match?: number;
  when?: string;
};

export function InterestRow({ r }: { r: RowData }) {
  const { act, busy } = useInterestAction();
  return (
    <div className={`list-row${r.note ? " has-note" : ""}`}>
      <Link className="avatar" href={`/profile/${r.id}`} aria-hidden="true" tabIndex={-1}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {r.photo ? <img src={r.photo} alt="" /> : <Silhouette />}
      </Link>
      <Link className="who" href={`/profile/${r.id}`}>
        <b>
          {r.name}
          {r.match !== undefined ? <span className="pill match-pill">{r.match}% match</span> : null}
        </b>
        <span>{[r.line, r.when].filter(Boolean).join(" · ")}</span>
      </Link>
      <div className="row">
        {r.mode === "received" ? (
          <>
            <button className="btn btn-ghost btn-sm" disabled={busy} onClick={() => act(r.id, "decline")}>Decline</button>
            <button className="btn btn-brand btn-sm" disabled={busy} onClick={() => act(r.id, "accept", { name: r.name, photo: r.photo })}>
              <Icon name="check" />
              Accept
            </button>
          </>
        ) : null}
        {r.mode === "sent" ? (
          <>
            <span className="pill">Waiting for reply</span>
            <button className="btn btn-quiet btn-sm" disabled={busy} onClick={() => act(r.id, "withdraw")}>Withdraw</button>
          </>
        ) : null}
        {r.mode === "sent-declined" ? <span className="pill">Declined</span> : null}
        {r.mode === "connected" ? (
          <Link className="btn btn-brand btn-sm" href={`/chat/${r.id}`}>
            <Icon name="chat" />
            Chat
          </Link>
        ) : null}
        {r.mode === "saved" ? (
          <Link className="btn btn-ghost btn-sm" href={`/profile/${r.id}`}>View biodata</Link>
        ) : null}
      </div>
      {r.note ? (
        <div className="note-bubble">
          {r.liked ? (
            <span className="note-liked">
              <Icon name="heart" />
              Liked: {r.liked}
            </span>
          ) : null}
          <p>{r.note}</p>
        </div>
      ) : null}
    </div>
  );
}
