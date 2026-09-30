"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { send, toast } from "../Toaster";

export function SettingsForms({ announcement, samplesOn, sampleTotal }: { announcement: string; samplesOn: boolean; sampleTotal: number }) {
  const router = useRouter();
  const [text, setText] = useState(announcement);
  const [busy, setBusy] = useState(false);

  const save = async (body: Record<string, unknown>) => {
    setBusy(true);
    try {
      const res = await send<{ message: string }>("/api/admin/settings", "POST", body);
      toast(res.message);
      router.refresh();
    } catch (e) {
      toast((e as Error).message, true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="stack">
      <section className="card">
        <div className="card-head"><h2>Announcement</h2><p>Shown in a strip at the top of every page</p></div>
        <div className="form">
          <label className="field">
            <span>Message</span>
            <textarea value={text} maxLength={280} onChange={(e) => setText(e.target.value)} placeholder="e.g. Diwali special: verified profiles get featured this week." />
            <small>{280 - text.length} characters left. Leave it empty to remove the strip.</small>
          </label>
          <div className="row">
            <button className="btn btn-gold btn-sm" disabled={busy} onClick={() => save({ announcement: text })}>Save announcement</button>
            {announcement ? (
              <button className="btn btn-quiet btn-sm" disabled={busy} onClick={() => { setText(""); save({ announcement: "" }); }}>Remove</button>
            ) : null}
          </div>
        </div>
      </section>

      <section className="card">
        <div className="card-head"><h2>Sample profiles</h2><p>{samplesOn ? `${sampleTotal} shown in browse` : "Switched off"}</p></div>
        <p className="muted small" style={{ marginBottom: 12 }}>
          24 illustrated sample profiles keep browse from looking empty while real families join. They carry a
          &quot;Sample profile&quot; tag and can&apos;t receive interests. Switch them off once you have enough members.
        </p>
        <button className={`btn btn-sm ${samplesOn ? "btn-ghost" : "btn-brand"}`} disabled={busy} onClick={() => save({ samples: !samplesOn })}>
          {samplesOn ? "Remove sample profiles" : "Show sample profiles again"}
        </button>
      </section>
    </div>
  );
}
