"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Icon } from "./Icon";
import { PdfButton } from "./PdfButton";
import { SaveButton } from "./SaveButton";
import { send, toast } from "./Toaster";
import type { Relation } from "@/lib/types";

type Kind = Relation["kind"];

export function useInterestAction() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const act = async (id: string, action: "send" | "accept" | "decline" | "withdraw") => {
    setBusy(true);
    try {
      const res = await send<{ result: string }>("/api/interests", "POST", { id, action });
      const msg: Record<string, string> = {
        sent: "Interest sent. You'll be able to chat once they accept.",
        connected: "You're connected. You can chat now.",
        declined: "Interest declined.",
        withdrawn: "Interest withdrawn.",
      };
      toast(msg[res.result] ?? "Done.");
      router.refresh();
    } catch (e) {
      toast((e as Error).message, true);
    } finally {
      setBusy(false);
    }
  };
  return { act, busy };
}

export function ProfileActions({ id, name, kind, saved, sample = false }: { id: string; name: string; kind: Kind; saved: boolean; sample?: boolean }) {
  const router = useRouter();
  const { act, busy } = useInterestAction();
  const [confirmBlock, setConfirmBlock] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [reason, setReason] = useState("Fake profile");
  const [note, setNote] = useState("");

  const report = async () => {
    try {
      const res = await send<{ message: string }>("/api/report", "POST", { id, reason, note });
      toast(res.message);
      setReporting(false);
      setNote("");
    } catch (e) {
      toast((e as Error).message, true);
    }
  };
  const first = name.split(" ")[0] || "them";

  const block = async (blocked: boolean) => {
    try {
      await send("/api/block", "POST", { id, blocked });
      toast(blocked ? `${first} is blocked. They can't see you or message you.` : "Unblocked.");
      router.refresh();
    } catch (e) {
      toast((e as Error).message, true);
    }
  };

  if (sample) {
    return (
      <div className="actions">
        <span className="pill sample" style={{ height: 44, padding: "0 16px" }}>Sample profile</span>
        <SaveButton id={id} initial={saved} variant="button" />
      </div>
    );
  }

  if (kind === "blocked") {
    return (
      <div className="card row">
        <Icon name="ban" />
        <span style={{ flex: 1 }}>You blocked this profile.</span>
        <button className="btn btn-ghost btn-sm" onClick={() => block(false)}>Unblock</button>
      </div>
    );
  }

  return (
    <div className="stack" style={{ gap: 10 }}>
      <div className="actions">
        {kind === "none" || kind === "declined-by-me" ? (
          <button className="btn btn-gold" disabled={busy} onClick={() => act(id, "send")}>
            <Icon name="heart" />
            Send interest
          </button>
        ) : null}
        {kind === "sent" ? (
          <>
            <span className="pill gold" style={{ height: 44, padding: "0 14px" }}><Icon name="check" />Interest sent</span>
            <button className="btn btn-quiet" disabled={busy} onClick={() => act(id, "withdraw")}>Withdraw</button>
          </>
        ) : null}
        {kind === "received" ? (
          <>
            <button className="btn btn-gold" disabled={busy} onClick={() => act(id, "accept")}>
              <Icon name="check" />
              Accept interest
            </button>
            <button className="btn btn-ghost" disabled={busy} onClick={() => act(id, "decline")}>Decline</button>
          </>
        ) : null}
        {kind === "connected" ? (
          <>
            <Link className="btn btn-brand" href={`/chat/${id}`}>
              <Icon name="chat" />
              Chat with {first}
            </Link>
            <PdfButton userId={id} isSelf={false} label="Download biodata" />
          </>
        ) : null}
        {kind === "declined-by-them" ? <span className="pill" style={{ height: 44, padding: "0 14px" }}>{first} declined your interest</span> : null}
        <SaveButton id={id} initial={saved} variant="button" />
      </div>
      {kind === "received" ? <p className="muted small">{first}&apos;s family is interested in you. Accepting lets you both chat and see contact details.</p> : null}
      <div className="row">
        {confirmBlock ? (
          <>
            <span className="small muted">Block {first}? They won&apos;t see your profile or be able to message you.</span>
            <button className="btn btn-quiet btn-sm btn-danger" onClick={() => block(true)}>Block</button>
            <button className="btn btn-quiet btn-sm" onClick={() => setConfirmBlock(false)}>Cancel</button>
          </>
        ) : (
          <>
            <button className="btn btn-quiet btn-sm" onClick={() => setConfirmBlock(true)}>
              <Icon name="ban" />
              Block
            </button>
            <button className="btn btn-quiet btn-sm" onClick={() => setReporting(!reporting)} aria-expanded={reporting}>
              <Icon name="info" />
              Report
            </button>
          </>
        )}
      </div>
      {reporting ? (
        <div className="report-form">
          <b>Report {first}&apos;s profile</b>
          <label className="field">
            <span>What&apos;s wrong?</span>
            <select value={reason} onChange={(e) => setReason(e.target.value)}>
              {["Fake profile", "Wrong information", "Inappropriate photo", "Abusive messages", "Asking for money", "Already married", "Other"].map((r) => (
                <option key={r}>{r}</option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Details (optional)</span>
            <textarea value={note} maxLength={500} onChange={(e) => setNote(e.target.value)} placeholder="Anything that helps our team check this profile" />
          </label>
          <div className="row">
            <button className="btn btn-brand btn-sm" onClick={report}>Send report</button>
            <button className="btn btn-quiet btn-sm" onClick={() => setReporting(false)}>Cancel</button>
          </div>
          <small className="muted">{first} won&apos;t know who reported them.</small>
        </div>
      ) : null}
    </div>
  );
}
