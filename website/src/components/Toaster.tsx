"use client";

import { useEffect, useState } from "react";

type ToastMsg = { text: string; error?: boolean; id: number };

export function toast(text: string, error = false) {
  window.dispatchEvent(new CustomEvent("sangam-toast", { detail: { text, error } }));
}

export function Toaster() {
  const [msg, setMsg] = useState<ToastMsg | null>(null);
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const on = (e: Event) => {
      const d = (e as CustomEvent<{ text: string; error?: boolean }>).detail;
      setMsg({ ...d, id: Date.now() });
      clearTimeout(timer);
      timer = setTimeout(() => setMsg(null), 3400);
    };
    window.addEventListener("sangam-toast", on);
    return () => {
      window.removeEventListener("sangam-toast", on);
      clearTimeout(timer);
    };
  }, []);
  return (
    <div className={`toast${msg?.error ? " err" : ""}`} role="status" aria-live="polite" hidden={!msg}>
      {msg?.text}
    </div>
  );
}

/** POST/PUT/DELETE JSON and surface the server's error message. */
export async function send<T = Record<string, unknown>>(url: string, method: string, body?: unknown): Promise<T> {
  const res = await fetch(url, {
    method,
    headers: body instanceof FormData ? undefined : { "Content-Type": "application/json" },
    body: body instanceof FormData ? body : body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error || "Something went wrong. Please try again.");
  return data as T;
}
