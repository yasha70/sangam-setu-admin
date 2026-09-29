"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Icon } from "./Icon";
import { PhotoManager } from "./PhotoManager";
import { toast } from "./Toaster";
import { completeness, publishProblems } from "@/lib/bio";
import { SECTIONS, type FieldDef } from "@/lib/options";
import type { Biodata, BiodataTextField } from "@/lib/types";

type Values = Partial<Record<BiodataTextField, string>>;

export function BiodataEditor({ initial, welcome }: { initial: Biodata; welcome: boolean }) {
  const router = useRouter();
  const [values, setValues] = useState<Values>(() => {
    const v: Values = {};
    for (const s of SECTIONS) for (const f of s.fields) v[f.key] = initial[f.key] ?? "";
    v.heading = initial.heading ?? "";
    return v;
  });
  const [photos, setPhotos] = useState(initial.photos);
  const [published, setPublished] = useState(initial.published);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);

  const draft: Biodata = useMemo(() => ({ ...initial, ...values, photos, published }), [initial, values, photos, published]);
  const pct = completeness(draft);
  const missing = publishProblems(draft);

  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (dirty) e.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const set = (k: BiodataTextField, v: string) => {
    setValues((cur) => ({ ...cur, [k]: v }));
    setDirty(true);
  };

  async function save(publish = published) {
    setSaving(true);
    try {
      const res = await fetch("/api/biodata", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fields: values, published: publish }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 422) {
        setPublished(false);
        setDirty(false);
        toast(data.error, true);
        return;
      }
      if (!res.ok) throw new Error(data.error || "Couldn't save. Please try again.");
      setPublished(Boolean(data.published));
      setDirty(false);
      toast(data.published ? "Saved. Your biodata is live." : "Saved.");
      router.refresh();
    } catch (e) {
      toast((e as Error).message, true);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="editor">
      <aside className="editor-nav" aria-label="Sections">
        <div className="progress">
          <span>{pct}% complete</span>
          <span className="bar"><i style={{ width: `${pct}%` }} /></span>
        </div>
        <a href="#photos">Photos</a>
        {SECTIONS.map((s) => (
          <a key={s.id} href={`#${s.id}`}>{s.title}</a>
        ))}
        <a href="#pdf">On your PDF</a>
      </aside>

      <form
        className="stack"
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
      >
        {welcome ? (
          <p className="notice ok">
            <Icon name="check" />
            <span>Your account is ready. Fill in your biodata, add a photo, then switch on <b>Publish</b> so families can find you.</span>
          </p>
        ) : null}

        <section id="photos" className="card">
          <div className="card-head">
            <h2>Photos</h2>
            <p>Up to 4. The first one is your main photo.</p>
          </div>
          <PhotoManager
            initial={photos}
            onChange={(p) => {
              setPhotos(p);
              if (!p.length) setPublished(false);
            }}
          />
        </section>

        {SECTIONS.map((s) => (
          <section key={s.id} id={s.id} className="card">
            <div className="card-head">
              <h2>{s.title}</h2>
            </div>
            {s.note ? (
              <p className="section-note">
                <Icon name={s.id === "horoscope" ? "info" : "lock"} />
                {s.note}
              </p>
            ) : null}
            <div className="grid2">
              {s.fields.map((f) => (
                <Field key={f.key} def={f} value={values[f.key] ?? ""} onChange={(v) => set(f.key, v)} />
              ))}
            </div>
          </section>
        ))}

        <section id="pdf" className="card">
          <div className="card-head">
            <h2>On your PDF</h2>
          </div>
          <div className="grid2">
            <label className="field wide">
              <span>Top line (optional)</span>
              <input
                id="f-heading"
                value={values.heading ?? ""}
                maxLength={80}
                list="heading-ideas"
                placeholder="e.g. || Shree Ganeshay Namah ||"
                onChange={(e) => set("heading", e.target.value)}
              />
              <datalist id="heading-ideas">
                <option value="|| Shree Ganeshay Namah ||" />
                <option value="|| Jai Shree Krishna ||" />
                <option value="|| Jai Mata Di ||" />
                <option value="|| Om Namah Shivaya ||" />
                <option value="|| Jai Jinendra ||" />
                <option value="|| Waheguru ||" />
              </datalist>
              <small>Printed in small italics above your name on the downloaded biodata.</small>
            </label>
          </div>
        </section>

        <div className="savebar">
          <label className="switch">
            <input
              type="checkbox"
              checked={published}
              onChange={(e) => {
                setPublished(e.target.checked);
                setDirty(true);
              }}
            />
            <i />
            {published ? "Published" : "Not published"}
          </label>
          <span className="muted small" style={{ minWidth: 0 }}>
            {published && missing.length ? `Add ${missing.join(", ")} to publish.` : dirty ? "Unsaved changes" : "All changes saved"}
          </span>
          <span className="spacer" />
          <Link className="btn btn-ghost btn-sm" href="/biodata">
            <Icon name="eye" />
            Preview
          </Link>
          <button className="btn btn-gold btn-sm" disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </form>
    </div>
  );
}

function Field({ def, value, onChange }: { def: FieldDef; value: string; onChange: (v: string) => void }) {
  const id = `f-${def.key}`;
  const common = { id, name: def.key, value, placeholder: def.placeholder };
  let control: React.ReactNode;
  switch (def.type) {
    case "select":
      control = (
        <select {...common} onChange={(e) => onChange(e.target.value)}>
          <option value="">Select</option>
          {def.options!.map((o) => (
            <option key={o} value={o}>{o}</option>
          ))}
        </select>
      );
      break;
    case "textarea":
      control = <textarea {...common} maxLength={def.max ?? 600} onChange={(e) => onChange(e.target.value)} />;
      break;
    case "date":
      control = <input {...common} type="date" max={new Date().toISOString().slice(0, 10)} min="1940-01-01" onChange={(e) => onChange(e.target.value)} />;
      break;
    case "time":
      control = <input {...common} type="time" onChange={(e) => onChange(e.target.value)} />;
      break;
    case "tel":
      control = <input {...common} type="tel" inputMode="numeric" maxLength={14} onChange={(e) => onChange(e.target.value)} />;
      break;
    case "email":
      control = <input {...common} type="email" maxLength={120} onChange={(e) => onChange(e.target.value)} />;
      break;
    case "suggest":
      control = (
        <>
          <input {...common} list={`${id}-list`} maxLength={80} onChange={(e) => onChange(e.target.value)} />
          <datalist id={`${id}-list`}>
            {def.options!.map((o) => (
              <option key={o} value={o} />
            ))}
          </datalist>
        </>
      );
      break;
    default:
      control = <input {...common} maxLength={def.max ?? 120} onChange={(e) => onChange(e.target.value)} />;
  }
  return (
    <div className={`field${def.wide ? " wide" : ""}`}>
      <label htmlFor={id}><span>{def.label}</span></label>
      {control}
      {def.hint ? <small>{def.hint}</small> : null}
    </div>
  );
}
