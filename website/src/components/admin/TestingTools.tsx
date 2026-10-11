"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Icon } from "../Icon";
import { send, toast } from "../Toaster";
import type { TestPair } from "@/lib/testing";

function Device({ n, acc, password, origin }: { n: number; acc: TestPair["a"]; password: string; origin: string }) {
  const link = `${origin}/t/${acc.token}`;
  return (
    <section className="card test-device">
      <span className="test-num">Device {n}</span>
      <h2>{acc.name}</h2>
      <dl className="test-creds">
        <div><dt>Mobile</dt><dd>{acc.phone}</dd></div>
        <div><dt>Password</dt><dd>{password}</dd></div>
      </dl>
      <label className="field">
        <span>One-tap login link</span>
        <input className="input" readOnly value={link} onFocus={(e) => e.currentTarget.select()} />
      </label>
      <div className="row">
        <button
          className="btn btn-ghost btn-sm"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(link);
              toast("Link copied.");
            } catch {
              toast("Select the link and copy it.", true);
            }
          }}
        >
          <Icon name="copy" />
          Copy
        </button>
        <a className="btn btn-whatsapp btn-sm" href={`https://wa.me/?text=${encodeURIComponent(`Sangam Setu test login (${acc.name}): ${link}`)}`} target="_blank" rel="noreferrer">
          <Icon name="share" />
          Send to my phone
        </a>
        <a className="btn btn-quiet btn-sm" href={link} target="_blank" rel="noreferrer">Open here</a>
      </div>
    </section>
  );
}

export function TestingTools({ pair }: { pair: TestPair | null }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [origin, setOrigin] = useState("");
  const [a, setA] = useState("");
  const [b, setB] = useState("");
  useEffect(() => setOrigin(window.location.origin), []);

  const run = async (body: Record<string, unknown>) => {
    setBusy(true);
    try {
      const res = await send<{ message: string }>("/api/admin/testing", "POST", body);
      toast(res.message);
      router.refresh();
    } catch (e) {
      toast((e as Error).message, true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="stack" style={{ gap: 18 }}>
      <p className="notice">
        <Icon name="info" />
        <span>
          Temporary tools for trying chat and calls yourself. Test accounts stay unpublished, so real members never see them. Delete
          them when you&apos;re done.
        </span>
      </p>

      {pair ? (
        <>
          <ol className="test-steps">
            <li>Open the <b>Device 1</b> link on one phone or browser, and the <b>Device 2</b> link on another (or in an incognito window).</li>
            <li>Each opens straight into the chat with the other test account.</li>
            <li>Send messages, photos and voice notes, or tap 📞 / 🎥 at the top of the chat to call. Allow microphone and camera when asked.</li>
          </ol>
          <div className="test-grid">
            <Device n={1} acc={pair.a} password={pair.password} origin={origin} />
            <Device n={2} acc={pair.b} password={pair.password} origin={origin} />
          </div>
          <div className="row">
            <button className="btn btn-ghost btn-sm" disabled={busy} onClick={() => run({ action: "refresh" })}>New login links</button>
            <button className="btn btn-quiet btn-sm btn-danger" disabled={busy} onClick={() => confirm("Delete both test accounts and their chats?") && run({ action: "delete" })}>
              <Icon name="trash" />
              Delete test accounts
            </button>
          </div>
          <small className="muted">Links work for 7 days. You can also log in normally with the mobile number and password above.</small>
        </>
      ) : (
        <section className="card">
          <div className="card-head">
            <h2>Two connected test accounts</h2>
          </div>
          <p className="muted" style={{ marginBottom: 14 }}>
            Creates a test groom and a test bride who are already connected, with one-tap login links for your two devices. No biodata or
            interest needed.
          </p>
          <button className="btn btn-brand" disabled={busy} onClick={() => run({ action: "create" })}>
            <Icon name="plus" />
            Create test accounts
          </button>
        </section>
      )}

      <section className="card">
        <div className="card-head">
          <h2>Connect two existing accounts</h2>
          <p>Skips the interest step</p>
        </div>
        <form
          className="row"
          style={{ alignItems: "flex-end" }}
          onSubmit={(e) => {
            e.preventDefault();
            run({ action: "connect", a, b });
          }}
        >
          <label className="field" style={{ flex: "1 1 220px" }}>
            <span>First account</span>
            <input className="input" value={a} onChange={(e) => setA(e.target.value)} placeholder="Mobile number or SS1001" required />
          </label>
          <label className="field" style={{ flex: "1 1 220px" }}>
            <span>Second account</span>
            <input className="input" value={b} onChange={(e) => setB(e.target.value)} placeholder="Mobile number or SS1002" required />
          </label>
          <button className="btn btn-gold" disabled={busy}>Connect</button>
        </form>
      </section>
    </div>
  );
}
