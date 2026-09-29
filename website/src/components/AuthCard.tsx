"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { send } from "./Toaster";
import { CREATED_FOR } from "@/lib/options";

type Mode = "login" | "signup";

const GENDER_FOR: Record<string, "male" | "female" | undefined> = {
  Son: "male",
  Brother: "male",
  Daughter: "female",
  Sister: "female",
};

/** One card for both: switch between Log in and Create account, like PakkaBill. No OTP. */
export function AuthCard({ initial }: { initial: Mode }) {
  const router = useRouter();
  const params = useSearchParams();
  const [mode, setMode] = useState<Mode>(initial);
  const [createdFor, setCreatedFor] = useState<string>("Myself");
  const [gender, setGender] = useState<"male" | "female" | "">("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const fixedGender = GENDER_FOR[createdFor];
  const self = createdFor === "Myself";
  const signup = mode === "signup";

  const switchTo = (m: Mode) => {
    setMode(m);
    setError("");
    window.history.replaceState(null, "", m === "signup" ? "/signup" : "/login");
  };

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const f = new FormData(e.currentTarget);
    if (signup && !fixedGender && !gender) {
      setError("Choose whether the profile is of a groom or a bride.");
      return;
    }
    setBusy(true);
    try {
      if (signup) {
        await send("/api/auth/signup", "POST", {
          createdFor,
          gender: fixedGender ?? gender,
          name: f.get("name"),
          phone: f.get("phone"),
          password: f.get("password"),
        });
        router.push("/biodata/edit?welcome=1");
      } else {
        await send("/api/auth/login", "POST", { phone: f.get("phone"), password: f.get("password") });
        const next = params.get("next");
        router.push(next && next.startsWith("/") && !next.startsWith("//") ? next : "/browse");
      }
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  return (
    <div className="card">
      <div className="seg" role="tablist" aria-label="Account" style={{ display: "flex", marginBottom: 18 }}>
        <a
          role="tab"
          href="/login"
          aria-selected={!signup}
          aria-current={!signup ? "page" : undefined}
          style={{ flex: 1, justifyContent: "center" }}
          onClick={(e) => {
            e.preventDefault();
            switchTo("login");
          }}
        >
          Log in
        </a>
        <a
          role="tab"
          href="/signup"
          aria-selected={signup}
          aria-current={signup ? "page" : undefined}
          style={{ flex: 1, justifyContent: "center" }}
          onClick={(e) => {
            e.preventDefault();
            switchTo("signup");
          }}
        >
          Create account
        </a>
      </div>

      <h1 style={{ marginTop: 0 }}>{signup ? "Create your biodata" : "Welcome back"}</h1>
      <p className="muted small">
        {signup ? "Fill in these details and you're in. No OTP needed." : "Log in with your mobile number and password."}
      </p>

      <form className="form" style={{ marginTop: 18 }} onSubmit={onSubmit}>
        {signup ? (
          <>
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
          </>
        ) : null}

        <label className="field">
          <span>Mobile number</span>
          <div className="phone-input">
            <b>+91</b>
            <input name="phone" required inputMode="numeric" autoComplete="tel-national" placeholder="98260 12345" maxLength={14} />
          </div>
          {signup ? <small>You&apos;ll log in with this. It isn&apos;t shown on your profile.</small> : null}
        </label>
        <label className="field">
          <span>Password</span>
          <input
            name="password"
            type="password"
            required
            minLength={signup ? 6 : undefined}
            autoComplete={signup ? "new-password" : "current-password"}
            placeholder={signup ? "At least 6 characters" : undefined}
          />
        </label>

        {error && <p className="error" role="alert">{error}</p>}
        <button className="btn btn-gold btn-block" disabled={busy}>
          {busy ? (signup ? "Creating…" : "Logging in…") : signup ? "Create account" : "Log in"}
        </button>
      </form>
    </div>
  );
}
