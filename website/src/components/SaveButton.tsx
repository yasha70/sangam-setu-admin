"use client";

import { useState } from "react";
import { Icon } from "./Icon";
import { send, toast } from "./Toaster";

export function SaveButton({ id, initial, variant = "icon" }: { id: string; initial: boolean; variant?: "icon" | "button" }) {
  const [saved, setSaved] = useState(initial);
  const toggle = async () => {
    const next = !saved;
    setSaved(next);
    try {
      await send("/api/saved", "POST", { id, saved: next });
      toast(next ? "Saved to your shortlist." : "Removed from your shortlist.");
    } catch (e) {
      setSaved(!next);
      toast((e as Error).message, true);
    }
  };
  if (variant === "button") {
    return (
      <button type="button" className="btn btn-ghost" aria-pressed={saved} onClick={toggle}>
        <Icon name="bookmark" className="ico" />
        {saved ? "Saved" : "Save"}
      </button>
    );
  }
  return (
    <button type="button" className="save-btn" aria-pressed={saved} aria-label={saved ? "Remove from shortlist" : "Save to shortlist"} onClick={toggle}>
      <Icon name="bookmark" />
    </button>
  );
}
