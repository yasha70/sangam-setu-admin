"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Icon } from "./Icon";
import { send, toast } from "./Toaster";

type Item = { id: string; name: string };
const KEY = "ss-compare";

function read(): Item[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "[]") as Item[];
  } catch {
    return [];
  }
}
function write(items: Item[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(items));
  } catch {
    // private mode: compare list lasts only for this page
  }
  window.dispatchEvent(new Event("sangam-compare"));
}

export function CompareButton({ id, name }: { id: string; name: string }) {
  const [on, setOn] = useState(false);
  useEffect(() => {
    const sync = () => setOn(read().some((i) => i.id === id));
    sync();
    window.addEventListener("sangam-compare", sync);
    return () => window.removeEventListener("sangam-compare", sync);
  }, [id]);
  return (
    <button
      type="button"
      className="btn btn-ghost"
      aria-pressed={on}
      onClick={() => {
        const cur = read();
        if (on) return write(cur.filter((i) => i.id !== id));
        if (cur.length >= 3) return toast("You can compare up to 3 profiles. Remove one first.", true);
        write([...cur, { id, name }]);
        toast(cur.length ? `Added. Compare ${cur.length + 1} profiles from the tray below.` : "Added. Pick one or two more to compare.");
      }}
    >
      <Icon name="scale" />
      {on ? "In compare" : "Compare"}
    </button>
  );
}

/** A small tray that follows you around while you pick profiles to compare. */
export function CompareTray() {
  const [items, setItems] = useState<Item[]>([]);
  const pathname = usePathname();
  useEffect(() => {
    const sync = () => setItems(read());
    sync();
    window.addEventListener("sangam-compare", sync);
    return () => window.removeEventListener("sangam-compare", sync);
  }, []);
  if (!items.length || pathname.startsWith("/compare") || pathname.startsWith("/chat")) return null;
  return (
    <div className="compare-tray" role="region" aria-label="Profiles to compare">
      <Icon name="scale" />
      <span className="ct-names">{items.map((i) => i.name.split(" ")[0]).join(", ")}</span>
      {items.length > 1 ? (
        <Link className="btn btn-gold btn-sm" href={`/compare?ids=${items.map((i) => i.id).join(",")}`}>Compare {items.length}</Link>
      ) : (
        <span className="small">Pick one more</span>
      )}
      <button className="icon-btn" aria-label="Clear compare list" onClick={() => write([])}><Icon name="x" /></button>
    </div>
  );
}

export function ClearCompare({ id }: { id: string }) {
  return (
    <button type="button" className="btn btn-quiet btn-sm" onClick={() => { write(read().filter((i) => i.id !== id)); location.href = `/compare?ids=${read().map((i) => i.id).join(",")}`; }}>
      Remove
    </button>
  );
}

export function PrivateNote({ id, initial, first }: { id: string; initial: string; first: string }) {
  const [text, setText] = useState(initial);
  const [saved, setSaved] = useState(initial);
  const [busy, setBusy] = useState(false);
  return (
    <section className="card private-note">
      <div className="card-head">
        <h2><Icon name="note" /> Your private note</h2>
        <p>Only you can see this</p>
      </div>
      <textarea
        className="input"
        rows={3}
        maxLength={1000}
        value={text}
        placeholder={`e.g. Papa spoke to ${first}'s father on Sunday. Ask about job transfer plans.`}
        onChange={(e) => setText(e.target.value)}
      />
      <div className="row" style={{ justifyContent: "flex-end", marginTop: 8 }}>
        {text !== saved ? <span className="muted small">Not saved yet</span> : saved ? <span className="muted small">Saved</span> : null}
        <button
          className="btn btn-ghost btn-sm"
          disabled={busy || text === saved}
          onClick={async () => {
            setBusy(true);
            try {
              const res = await send<{ text: string }>("/api/note", "POST", { id, text });
              setSaved(res.text);
              setText(res.text);
              toast("Note saved.");
            } catch (e) {
              toast((e as Error).message, true);
            } finally {
              setBusy(false);
            }
          }}
        >
          Save note
        </button>
      </div>
    </section>
  );
}
