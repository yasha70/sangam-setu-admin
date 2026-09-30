"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { send, toast } from "./Toaster";

export function AccountForms({ published }: { published: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState("");

  async function changePassword(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const f = new FormData(form);
    setBusy(true);
    try {
      const res = await send<{ message: string }>("/api/account/password", "POST", { current: f.get("current"), next: f.get("next") });
      toast(res.message);
      form.reset();
    } catch (err) {
      toast((err as Error).message, true);
    } finally {
      setBusy(false);
    }
  }

  async function togglePublished() {
    setBusy(true);
    try {
      const res = await fetch("/api/biodata", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fields: {}, published: !published }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Couldn't change visibility.");
      toast(data.published ? "Your biodata is visible again." : "Your biodata is hidden. Nobody new can find you.");
      router.refresh();
    } catch (err) {
      toast((err as Error).message, true);
    } finally {
      setBusy(false);
    }
  }

  async function deleteAccount(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    try {
      await send("/api/account/delete", "POST", { password: new FormData(e.currentTarget).get("password") });
      router.push("/");
      router.refresh();
    } catch (err) {
      toast((err as Error).message, true);
      setBusy(false);
    }
  }

  return (
    <div className="stack">
      <section className="card">
        <div className="card-head"><h2>Profile visibility</h2><p>{published ? "Visible to families" : "Hidden"}</p></div>
        <p className="muted small" style={{ marginBottom: 12 }}>
          Found a match, or taking a break? Hide your biodata so it stops appearing in browse. Your connections and chats stay.
        </p>
        <div className="row">
          <button className={`btn btn-sm ${published ? "btn-ghost" : "btn-brand"}`} disabled={busy} onClick={togglePublished}>
            {published ? "Hide my biodata" : "Show my biodata again"}
          </button>
          <Link className="btn btn-quiet btn-sm" href="/biodata/edit">Edit biodata</Link>
        </div>
      </section>

      <section className="card">
        <div className="card-head"><h2>Change password</h2></div>
        <form className="form" style={{ maxWidth: 420 }} onSubmit={changePassword}>
          <label className="field">
            <span>Current password</span>
            <input name="current" type="password" required autoComplete="current-password" />
          </label>
          <label className="field">
            <span>New password</span>
            <input name="next" type="password" required minLength={6} autoComplete="new-password" placeholder="At least 6 characters" />
          </label>
          <button className="btn btn-gold btn-sm" disabled={busy} style={{ justifySelf: "start" }}>Change password</button>
        </form>
      </section>

      <section className="card danger-zone">
        <div className="card-head"><h2>Delete account</h2></div>
        <p className="small" style={{ marginBottom: 12 }}>
          Deletes your account, biodata, photos and connections for good. This can&apos;t be undone. Type <b>DELETE</b> and your password to confirm.
        </p>
        <form className="form" style={{ maxWidth: 420 }} onSubmit={deleteAccount}>
          <label className="field">
            <span>Type DELETE</span>
            <input value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="off" />
          </label>
          <label className="field">
            <span>Password</span>
            <input name="password" type="password" required autoComplete="current-password" />
          </label>
          <button className="btn btn-danger-solid btn-sm" disabled={busy || confirm !== "DELETE"} style={{ justifySelf: "start" }}>
            Delete my account
          </button>
        </form>
      </section>
    </div>
  );
}
