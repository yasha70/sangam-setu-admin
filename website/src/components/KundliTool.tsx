"use client";

import { useMemo, useState } from "react";
import { Icon } from "./Icon";
import { KootaBars, Ring } from "./Insights";
import { NAKSHATRA_DEFS, gunaMilan, rashiLabel } from "@/lib/astro";

type Side = { nak: number | ""; rashi: number | "" };

function SidePicker({ title, side, onChange }: { title: string; side: Side; onChange: (s: Side) => void }) {
  const allowed = side.nak === "" ? [] : NAKSHATRA_DEFS[side.nak].rashis;
  const id = title.toLowerCase();
  return (
    <fieldset className="k-side">
      <legend>{title}</legend>
      <label className="field">
        <span>Nakshatra</span>
        <select
          id={`k-${id}-nak`}
          value={side.nak}
          onChange={(e) => {
            const nak = e.target.value === "" ? "" : Number(e.target.value);
            onChange({ nak, rashi: nak === "" ? "" : NAKSHATRA_DEFS[nak].rashis[0] });
          }}
        >
          <option value="">Choose nakshatra</option>
          {NAKSHATRA_DEFS.map((n, i) => (
            <option key={n.name} value={i}>{n.name}</option>
          ))}
        </select>
      </label>
      <label className="field">
        <span>Rashi (Moon sign)</span>
        <select id={`k-${id}-rashi`} value={side.rashi} disabled={allowed.length < 2} onChange={(e) => onChange({ ...side, rashi: Number(e.target.value) })}>
          {allowed.length ? null : <option value="">Follows the nakshatra</option>}
          {[...allowed].sort((a, b) => a - b).map((r) => (
            <option key={r} value={r}>{rashiLabel(r)}</option>
          ))}
        </select>
        {allowed.length > 1 ? <small>This nakshatra spans two rashis. Pick the one in the kundli.</small> : null}
      </label>
    </fieldset>
  );
}

export function KundliTool({ initial, compact = false }: { initial?: { groom?: Side; bride?: Side }; compact?: boolean }) {
  const [groom, setGroom] = useState<Side>(initial?.groom ?? { nak: "", rashi: "" });
  const [bride, setBride] = useState<Side>(initial?.bride ?? { nak: "", rashi: "" });
  const result = useMemo(() => {
    if (groom.nak === "" || bride.nak === "" || groom.rashi === "" || bride.rashi === "") return null;
    return gunaMilan({ nak: groom.nak, rashi: groom.rashi }, { nak: bride.nak, rashi: bride.rashi });
  }, [groom, bride]);

  const shareText = result
    ? `Our Guna Milan: ${result.total}/36 (${result.verdict}). Groom ${result.groom.nakshatra}, bride ${result.bride.nakshatra}. Worked out free on Sangam Setu.`
    : "";

  return (
    <div className={`kundli${compact ? " compact" : ""}`}>
      <div className="k-inputs">
        <SidePicker title="Groom" side={groom} onChange={setGroom} />
        <span className="k-plus" aria-hidden="true"><Icon name="heart" /></span>
        <SidePicker title="Bride" side={bride} onChange={setBride} />
      </div>
      {result ? (
        <div className="k-result" aria-live="polite">
          <div className="k-score">
            <Ring value={result.total} max={36} size={compact ? 110 : 132} label="of 36 gunas" tone={result.tone === "low" ? "muted" : result.tone === "fair" ? "gold" : "green"} />
            <div>
              <span className={`pill guna-${result.tone}`}>{result.verdict}</span>
              <p className="muted small" style={{ marginTop: 8 }}>
                18 or more is traditionally considered acceptable, and 25 or more very good.
              </p>
              {!compact ? (
                <a className="btn btn-whatsapp btn-sm" style={{ marginTop: 10 }} href={`https://wa.me/?text=${encodeURIComponent(shareText)}`} target="_blank" rel="noreferrer">
                  <Icon name="share" />
                  Share result
                </a>
              ) : null}
            </div>
          </div>
          <KootaBars result={result} />
          {result.doshas.length ? (
            <ul className="doshas">
              {result.doshas.map((d) => (
                <li key={d}><Icon name="info" />{d}</li>
              ))}
            </ul>
          ) : null}
          <p className="fineprint">A guide based on Moon nakshatra and rashi. Tables vary slightly between panchangs, so confirm with your family pandit.</p>
        </div>
      ) : (
        <div className="k-placeholder">
          <Icon name="moon" />
          <p>Choose both nakshatras to see the 36-point Ashtakoota match, koota by koota.</p>
        </div>
      )}
    </div>
  );
}
