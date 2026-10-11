"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Icon } from "./Icon";
import { Ring } from "./Insights";
import { PhotoManager } from "./PhotoManager";
import { toast } from "./Toaster";
import { publishProblems, strengthScore, strengthSteps } from "@/lib/bio";
import { DIET, HEIGHTS, MARITAL_STATUS, MOTHER_TONGUES, RELIGIONS, SECTIONS, STATES, type FieldDef } from "@/lib/options";
import { MAX_PROMPTS, PROMPTS, PROMPT_ANSWER_MAX } from "@/lib/prompts";
import type { Biodata, BiodataTextField, PartnerPrefs, PromptAnswer } from "@/lib/types";

type Values = Partial<Record<BiodataTextField, string>>;

const HEIGHT_OPTS = HEIGHTS.map((label, i) => ({ inches: 54 + i, label: label.replace(/\s*\(.*\)$/, "") }));

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
  const [prompts, setPrompts] = useState<PromptAnswer[]>(initial.prompts ?? []);
  const [prefs, setPrefs] = useState<PartnerPrefs>(initial.prefs ?? {});
  const [photoPrivacy, setPhotoPrivacy] = useState(initial.photoPrivacy ?? "all");
  const [familyShare, setFamilyShare] = useState(initial.familyShare !== false);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);

  const draft: Biodata = useMemo(
    () => ({ ...initial, ...values, photos, published, prompts: prompts.filter((p) => p.a.trim()), prefs }),
    [initial, values, photos, published, prompts, prefs],
  );
  const pct = strengthScore(draft);
  const steps = strengthSteps(draft);
  const missing = publishProblems(draft);
  const touch = () => setDirty(true);
  const setPref = <K extends keyof PartnerPrefs>(k: K, v: PartnerPrefs[K]) => {
    setPrefs((cur) => ({ ...cur, [k]: v }));
    touch();
  };

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
        body: JSON.stringify({ fields: values, published: publish, prompts: prompts.filter((p) => p.a.trim()), prefs, photoPrivacy, familyShare }),
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
        <div className="progress strength-mini">
          <Ring value={pct} size={52} tone={pct >= 75 ? "green" : "brand"} />
          <span>
            <b>Profile strength</b>
            <small>{steps.filter((x) => !x.done)[0]?.label ?? "All set"}</small>
          </span>
        </div>
        <a href="#photos">Photos</a>
        {SECTIONS.map((s) => (
          <a key={s.id} href={`#${s.id}`}>{s.title}</a>
        ))}
        <a href="#prompts">Prompts</a>
        <a href="#prefs">Partner preferences</a>
        <a href="#privacy">Privacy</a>
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

        <section id="prompts" className="card">
          <div className="card-head">
            <h2>Prompts</h2>
            <p>Up to {MAX_PROMPTS}. Others can like an answer and send a note about it.</p>
          </div>
          <div className="stack" style={{ gap: 12 }}>
            {prompts.map((p, i) => (
              <div key={i} className="prompt-edit">
                <div className="row" style={{ flexWrap: "nowrap" }}>
                  <label className="sr-only" htmlFor={`prompt-q-${i}`}>Prompt {i + 1}</label>
                  <select
                    id={`prompt-q-${i}`}
                    className="input"
                    value={p.q}
                    onChange={(e) => {
                      setPrompts((cur) => cur.map((x, n) => (n === i ? { ...x, q: e.target.value } : x)));
                      touch();
                    }}
                  >
                    {PROMPTS.filter((q) => q === p.q || !prompts.some((x) => x.q === q)).map((q) => (
                      <option key={q}>{q}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className="icon-btn"
                    aria-label="Remove this prompt"
                    onClick={() => {
                      setPrompts((cur) => cur.filter((_, n) => n !== i));
                      touch();
                    }}
                  >
                    <Icon name="trash" />
                  </button>
                </div>
                <label className="sr-only" htmlFor={`prompt-a-${i}`}>Your answer</label>
                <textarea
                  id={`prompt-a-${i}`}
                  className="input"
                  rows={2}
                  maxLength={PROMPT_ANSWER_MAX}
                  value={p.a}
                  placeholder="Be specific. Small details start the best conversations."
                  onChange={(e) => {
                    setPrompts((cur) => cur.map((x, n) => (n === i ? { ...x, a: e.target.value } : x)));
                    touch();
                  }}
                />
                <small className="muted">{PROMPT_ANSWER_MAX - p.a.length} characters left</small>
              </div>
            ))}
            {prompts.length < MAX_PROMPTS ? (
              <button
                type="button"
                className="prompt-add"
                onClick={() => {
                  const q = PROMPTS.find((x) => !prompts.some((p) => p.q === x))!;
                  setPrompts((cur) => [...cur, { q, a: "" }]);
                  touch();
                }}
              >
                <Icon name="plus" />
                Add a prompt
              </button>
            ) : null}
          </div>
        </section>

        <section id="prefs" className="card">
          <div className="card-head">
            <h2>Partner preferences</h2>
            <p>Used for your match scores and daily picks. Leave anything open.</p>
          </div>
          <div className="grid2">
            <div className="field">
              <span>Age</span>
              <div className="range-pair">
                <input type="number" className="input" min={18} max={80} inputMode="numeric" aria-label="Youngest age" placeholder="From" value={prefs.ageMin ?? ""} onChange={(e) => setPref("ageMin", e.target.value ? Number(e.target.value) : undefined)} />
                <span>to</span>
                <input type="number" className="input" min={18} max={80} inputMode="numeric" aria-label="Oldest age" placeholder="To" value={prefs.ageMax ?? ""} onChange={(e) => setPref("ageMax", e.target.value ? Number(e.target.value) : undefined)} />
              </div>
            </div>
            <div className="field">
              <span>Height</span>
              <div className="range-pair">
                <select className="input" aria-label="Shortest height" value={prefs.heightMin ?? ""} onChange={(e) => setPref("heightMin", e.target.value ? Number(e.target.value) : undefined)}>
                  <option value="">Any</option>
                  {HEIGHT_OPTS.map((h) => <option key={h.inches} value={h.inches}>{h.label}</option>)}
                </select>
                <span>to</span>
                <select className="input" aria-label="Tallest height" value={prefs.heightMax ?? ""} onChange={(e) => setPref("heightMax", e.target.value ? Number(e.target.value) : undefined)}>
                  <option value="">Any</option>
                  {HEIGHT_OPTS.map((h) => <option key={h.inches} value={h.inches}>{h.label}</option>)}
                </select>
              </div>
            </div>
            <Multi label="Religion" options={RELIGIONS} value={prefs.religions} onChange={(v) => setPref("religions", v)} />
            <Multi label="Marital status" options={MARITAL_STATUS} value={prefs.marital} onChange={(v) => setPref("marital", v)} />
            <Multi label="Diet" options={DIET} value={prefs.diets} onChange={(v) => setPref("diets", v)} />
            <div className="field">
              <span>Manglik</span>
              <select className="input" value={prefs.manglik ?? ""} onChange={(e) => setPref("manglik", e.target.value as PartnerPrefs["manglik"])}>
                <option value="">Doesn&apos;t matter</option>
                <option value="No">Non-manglik only</option>
                <option value="Yes">Manglik only</option>
              </select>
            </div>
            <Multi label="Mother tongue" options={MOTHER_TONGUES} value={prefs.motherTongues} onChange={(v) => setPref("motherTongues", v)} wide />
            <Multi label="Lives in" options={STATES} value={prefs.states} onChange={(v) => setPref("states", v)} wide scroll />
            <label className="field wide">
              <span>Community or caste</span>
              <input className="input" value={prefs.communities ?? ""} maxLength={160} placeholder="e.g. Agrawal, Maheshwari (comma separated)" onChange={(e) => setPref("communities", e.target.value)} />
              <small>Leave empty if community doesn&apos;t matter.</small>
            </label>
          </div>
        </section>

        <section id="privacy" className="card">
          <div className="card-head">
            <h2>Privacy</h2>
          </div>
          <div className="stack" style={{ gap: 14 }}>
            <fieldset className="radio-cards">
              <legend>Who can see your photos</legend>
              <label>
                <input type="radio" name="photoPrivacy" checked={photoPrivacy === "all"} onChange={() => { setPhotoPrivacy("all"); touch(); }} />
                <span>
                  <b>All members</b>
                  <small>Recommended. Profiles with photos get many more interests.</small>
                </span>
              </label>
              <label>
                <input type="radio" name="photoPrivacy" checked={photoPrivacy === "interest"} onChange={() => { setPhotoPrivacy("interest"); touch(); }} />
                <span>
                  <b>Only people I&apos;ve shown interest in</b>
                  <small>Others see a locked placeholder until you send them an interest or accept theirs.</small>
                </span>
              </label>
            </fieldset>
            <label className="switch">
              <input type="checkbox" checked={familyShare} onChange={(e) => { setFamilyShare(e.target.checked); touch(); }} />
              <i />
              Let members share my profile with their family on a review link
            </label>
            <small className="muted">Family links never show your contact details or address.</small>
          </div>
        </section>

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

function Multi({ label, options, value = [], onChange, wide, scroll }: { label: string; options: readonly string[]; value?: string[]; onChange: (v: string[]) => void; wide?: boolean; scroll?: boolean }) {
  const toggle = (o: string) => onChange(value.includes(o) ? value.filter((x) => x !== o) : [...value, o]);
  return (
    <div className={`field${wide ? " wide" : ""}`} role="group" aria-label={label}>
      <span>
        {label}
        <small className="muted"> · {value.length ? `${value.length} selected` : "Any"}</small>
      </span>
      <div className={`multi${scroll ? " scroll" : ""}`}>
        {options.map((o) => (
          <button key={o} type="button" aria-pressed={value.includes(o)} onClick={() => toggle(o)}>
            {o}
          </button>
        ))}
      </div>
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
          {value && !def.options!.includes(value) ? <option value={value}>{value}</option> : null}
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
