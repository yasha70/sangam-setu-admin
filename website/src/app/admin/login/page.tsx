"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { send } from "@/components/Toaster";

export default function AdminLogin() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <div className="auth" style={{ minHeight: "auto", paddingTop: 20 }}>
      <form
        className="card form"
        onSubmit={async (e) => {
          e.preventDefault();
          setError("");
          setBusy(true);
          try {
            await send("/api/admin/login", "POST", { password: new FormData(e.currentTarget).get("password") });
            router.push("/admin");
            router.refresh();
          } catch (err) {
            setError((err as Error).message);
            setBusy(false);
          }
        }}
      >
        <p className="eyebrow">Sangam Setu</p>
        <h1 style={{ margin: 0 }}>Admin login</h1>
        <label className="field">
          <span>Admin password</span>
          <input name="password" type="password" required autoComplete="current-password" autoFocus />
        </label>
        {error ? <p className="error" role="alert">{error}</p> : null}
        <button className="btn btn-brand btn-block" disabled={busy}>{busy ? "Checking…" : "Log in"}</button>
      </form>
    </div>
  );
}
