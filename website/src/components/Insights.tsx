import Link from "next/link";
import { Icon } from "./Icon";
import type { GunaResult } from "@/lib/astro";
import type { Match } from "@/lib/match";

/** A circular score, e.g. 86% match or 24/36 gunas. */
export function Ring({ value, max = 100, size = 64, label, tone = "brand" }: { value: number; max?: number; size?: number; label?: string; tone?: "brand" | "gold" | "green" | "muted" }) {
  const r = 26;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(1, value / max));
  const text = max === 100 ? `${Math.round(value)}%` : `${value % 1 ? value.toFixed(1) : value}`;
  return (
    <span className={`ring ring-${tone}`} style={{ width: size, height: size }} role="img" aria-label={label ? `${text} ${label}` : text}>
      <svg viewBox="0 0 64 64" aria-hidden="true">
        <circle cx="32" cy="32" r={r} className="ring-track" />
        <circle cx="32" cy="32" r={r} className="ring-bar" strokeDasharray={`${c * pct} ${c}`} transform="rotate(-90 32 32)" />
      </svg>
      <b>{text}</b>
      {label ? <small>{label}</small> : null}
    </span>
  );
}

export function MatchCard({ match, mutual, common, theirName }: { match: Match; mutual: boolean; common: string[]; theirName: string }) {
  if (!match.reasons.length && !common.length) return null;
  const met = match.reasons.filter((r) => r.ok).length;
  return (
    <section className="card insight">
      <div className="insight-head">
        <Ring value={match.score} size={74} label="match" />
        <div>
          <h2>Why you match</h2>
          <p className="muted small">
            {match.usedDefaults ? (
              <>
                Based on the usual age gap and your religion. <Link href="/biodata/edit#prefs">Set your preferences</Link> for sharper matches.
              </>
            ) : (
              <>
                {theirName} fits {met} of your {match.reasons.length} preferences.
              </>
            )}
          </p>
          {mutual ? (
            <span className="pill mutual">
              <Icon name="sparkle" />
              Mutual match: you fit what they&apos;re looking for too
            </span>
          ) : null}
        </div>
      </div>
      {match.reasons.length ? (
        <ul className="reasons">
          {match.reasons.map((r) => (
            <li key={r.label} data-ok={r.ok === null ? "unknown" : String(r.ok)}>
              <span className="mark" aria-hidden="true">{r.ok === null ? "?" : r.ok ? "✓" : "✕"}</span>
              <b>{r.label}</b>
              <span>{r.detail}</span>
            </li>
          ))}
        </ul>
      ) : null}
      {common.length ? (
        <div className="common">
          <span className="eyebrow">Things in common</span>
          <div className="chips">
            {common.map((c) => (
              <span key={c} className="pill gold">{c}</span>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}

export function GunaCard({
  result,
  missing,
  manglikNote,
  theirName,
}: {
  result: GunaResult | null;
  missing: ("you" | "them")[];
  manglikNote: string | null;
  theirName: string;
}) {
  if (!result) {
    return (
      <section className="card insight guna-empty">
        <div className="insight-head">
          <span className="guna-moon" aria-hidden="true"><Icon name="moon" /></span>
          <div>
            <h2>Guna Milan</h2>
            <p className="muted small">
              {missing.includes("you") ? (
                <>
                  Add your nakshatra to see your 36-point kundli match with {theirName} and everyone else.{" "}
                  <Link href="/biodata/edit#horoscope">Add it now</Link>
                </>
              ) : (
                <>{theirName} hasn&apos;t added a nakshatra yet, so Guna Milan isn&apos;t available.</>
              )}
            </p>
          </div>
        </div>
      </section>
    );
  }
  return (
    <section className="card insight">
      <div className="insight-head">
        <Ring value={result.total} max={36} size={74} label="of 36" tone={result.tone === "low" ? "muted" : result.tone === "fair" ? "gold" : "green"} />
        <div>
          <h2>Guna Milan</h2>
          <p className="small">
            <span className={`pill guna-${result.tone}`}>{result.verdict}</span>
          </p>
          <p className="muted small" style={{ marginTop: 6 }}>
            Groom: {result.groom.nakshatra}, {result.groom.rashi} · Bride: {result.bride.nakshatra}, {result.bride.rashi}
          </p>
        </div>
      </div>
      <KootaBars result={result} />
      {result.doshas.length || manglikNote ? (
        <ul className="doshas">
          {result.doshas.map((d) => (
            <li key={d}><Icon name="info" />{d}</li>
          ))}
          {manglikNote ? <li><Icon name="info" />{manglikNote}</li> : null}
        </ul>
      ) : null}
      <p className="fineprint">Worked out from Moon nakshatra and rashi. Point tables vary a little between panchangs, so treat this as a guide and confirm with your family pandit.</p>
    </section>
  );
}

export function KootaBars({ result }: { result: GunaResult }) {
  return (
    <ul className="kootas">
      {result.kootas.map((k) => (
        <li key={k.key} title={k.note}>
          <span className="k-name">
            <b>{k.name}</b>
            <small>{k.meaning}</small>
          </span>
          <span className="k-bar" aria-hidden="true">
            <i style={{ width: `${(k.got / k.max) * 100}%` }} data-zero={k.got === 0 ? "true" : undefined} />
          </span>
          <span className="k-num">
            {k.got % 1 ? k.got.toFixed(1) : k.got}/{k.max}
          </span>
        </li>
      ))}
    </ul>
  );
}
