"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { send } from "@/components/Toaster";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const f = new FormData(e.currentTarget);
    setBusy(true);
    try {
      await send("/api/auth/login", "POST", { phone: f.get("phone"), password: f.get("password") });
      const next = params.get("next");
      router.push(next && next.startsWith("/") && !next.startsWith("//") ? next : "/browse");
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  return (
    <form className="form" style={{ marginTop: 18 }} onSubmit={onSubmit}>
      <label className="field">
        <span>Mobile number</span>
        <div className="phone-input">
          <b>+91</b>
          <input name="phone" required inputMode="numeric" autoComplete="tel-national" placeholder="98260 12345" maxLength={14} />
        </div>
      </label>
      <label className="field">
        <span>Password</span>
        <input name="password" type="password" required autoComplete="current-password" />
      </label>
      {error && <p className="error" role="alert">{error}</p>}
      <button className="btn btn-gold btn-block" disabled={busy}>{busy ? "Logging in…" : "Log in"}</button>
    </form>
  );
}

export default function LoginPage() {
  return (
    <main className="auth">
      <div className="card">
        <p className="eyebrow">Welcome back</p>
        <h1>Log in</h1>
        <Suspense>
          <LoginForm />
        </Suspense>
        <p className="foot">
          New to Sangam Setu? <Link href="/signup">Create a biodata</Link>
        </p>
      </div>
    </main>
  );
}
