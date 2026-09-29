"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { send } from "@/components/Toaster";
import { CREATED_FOR } from "@/lib/options";

const GENDER_FOR: Record<string, "male" | "female" | undefined> = {
  Son: "male",
  Brother: "male",
  Daughter: "female",
  Sister: "female",
};

export default function SignupPage() {
  const router = useRouter();
  const [createdFor, setCreatedFor] = useState<string>("Myself");
  const [gender, setGender] = useState<"male" | "female" | "">("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const fixedGender = GENDER_FOR[createdFor];
  const self = createdFor === "Myself";

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const f = new FormData(e.currentTarget);
    setBusy(true);
    try {
      await send("/api/auth/signup", "POST", {
        createdFor,
        gender: fixedGender ?? gender,
        name: f.get("name"),
        phone: f.get("phone"),
        password: f.get("password"),
      });
      router.push("/biodata/edit?welcome=1");
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  return (
    <main className="auth">
      <div className="card">
        <p className="eyebrow">Free to join</p>
        <h1>Create a biodata</h1>
        <p className="muted small">Takes a minute. You&apos;ll fill in the details next.</p>
        <form className="form" style={{ marginTop: 18 }} onSubmit={onSubmit}>
          <div className="field">
            <span>This profile is for</span>
            <div className="choice" role="radiogroup" aria-label="This profile is for">
              {CREATED_FOR.map((c) => (
                <label key={c}>
                  <input type="radio" name="createdFor" value={c} checked={createdFor === c} onChange={() => setCreatedFor(c)} />
                  <span>{c}</span>
                </label>
              ))}
            </div>
          </div>
          {!fixedGender && (
            <div className="field">
              <span>The profile is of a</span>
              <div className="choice" role="radiogroup" aria-label="Profile type">
                <label>
                  <input type="radio" name="gender" value="male" checked={gender === "male"} onChange={() => setGender("male")} />
                  <span>Groom</span>
                </label>
                <label>
                  <input type="radio" name="gender" value="female" checked={gender === "female"} onChange={() => setGender("female")} />
                  <span>Bride</span>
                </label>
              </div>
            </div>
          )}
          <label className="field">
            <span>{self ? "Your full name" : "Full name of the bride or groom"}</span>
            <input name="name" required minLength={2} maxLength={80} autoComplete={self ? "name" : "off"} placeholder="e.g. Aditya Joshi" />
          </label>
          <label className="field">
            <span>Mobile number</span>
            <div className="phone-input">
              <b>+91</b>
              <input name="phone" required inputMode="numeric" autoComplete="tel-national" placeholder="98260 12345" maxLength={14} />
            </div>
            <small>You&apos;ll use this to log in. It isn&apos;t shown on your profile.</small>
          </label>
          <label className="field">
            <span>Password</span>
            <input name="password" type="password" required minLength={6} autoComplete="new-password" placeholder="At least 6 characters" />
          </label>
          {error && <p className="error" role="alert">{error}</p>}
          <button className="btn btn-gold btn-block" disabled={busy}>{busy ? "Creating…" : "Create account"}</button>
        </form>
        <p className="foot">
          Already have an account? <Link href="/login">Log in</Link>
        </p>
      </div>
    </main>
  );
}
