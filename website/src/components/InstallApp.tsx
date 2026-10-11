"use client";

import { useEffect, useState } from "react";
import { Icon } from "./Icon";

type PromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

/** "Add to home screen": Sangam Setu installs like an app, no Play Store needed. */
export function InstallApp() {
  const [evt, setEvt] = useState<PromptEvent | null>(null);
  const [ios, setIos] = useState(false);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    const standalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone;
    if (standalone) {
      setInstalled(true);
      return;
    }
    setIos(/iphone|ipad|ipod/i.test(navigator.userAgent));
    const on = (e: Event) => {
      e.preventDefault();
      setEvt(e as PromptEvent);
    };
    window.addEventListener("beforeinstallprompt", on);
    window.addEventListener("appinstalled", () => setInstalled(true));
    return () => window.removeEventListener("beforeinstallprompt", on);
  }, []);

  if (installed || (!evt && !ios)) return null;
  return (
    <section className="card install">
      <span className="promo-ico"><Icon name="install" /></span>
      <h2>Get the app</h2>
      {evt ? (
        <>
          <p className="muted small">Install Sangam Setu on your phone. It opens like an app, with no Play Store download.</p>
          <button
            className="btn btn-brand btn-sm"
            onClick={async () => {
              await evt.prompt();
              setEvt(null);
            }}
          >
            Install
          </button>
        </>
      ) : (
        <p className="muted small">On iPhone, tap the Share button in Safari, then <b>Add to Home Screen</b>.</p>
      )}
    </section>
  );
}
