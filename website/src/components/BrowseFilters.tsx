"use client";

import Link from "next/link";
import { useState } from "react";
import { Icon } from "./Icon";
import { MARITAL_STATUS, RELIGIONS, STATES } from "@/lib/options";

export type Filters = {
  q?: string;
  ageMin?: string;
  ageMax?: string;
  state?: string;
  community?: string;
  religion?: string;
  marital?: string;
  photo?: string;
};

export function BrowseFilters({ f, count }: { f: Filters; count: number }) {
  const [open, setOpen] = useState(false);
  return (
    <aside className="filters">
      <div className="row" style={{ marginBottom: 10 }}>
        <button type="button" className="btn btn-ghost btn-sm filters-toggle" aria-expanded={open} onClick={() => setOpen(!open)}>
          <Icon name="sliders" />
          Filters
        </button>
        <span className="muted small">{count} {count === 1 ? "profile" : "profiles"}</span>
      </div>
      <div className="card" data-open={open ? "true" : "false"}>
        <form className="form" method="get" action="/browse">
          <label className="field">
            <span>Search</span>
            <input name="q" defaultValue={f.q} placeholder="Name, city or occupation" />
          </label>
          <div className="grid2" style={{ gridTemplateColumns: "1fr 1fr" }}>
            <label className="field">
              <span>Age from</span>
              <input name="ageMin" type="number" min={18} max={80} inputMode="numeric" defaultValue={f.ageMin} placeholder="21" />
            </label>
            <label className="field">
              <span>to</span>
              <input name="ageMax" type="number" min={18} max={80} inputMode="numeric" defaultValue={f.ageMax} placeholder="35" />
            </label>
          </div>
          <label className="field">
            <span>State</span>
            <select name="state" defaultValue={f.state ?? ""}>
              <option value="">Any state</option>
              {STATES.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Religion</span>
            <select name="religion" defaultValue={f.religion ?? ""}>
              <option value="">Any religion</option>
              {RELIGIONS.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Community or caste</span>
            <input name="community" defaultValue={f.community} placeholder="e.g. Agrawal" />
          </label>
          <label className="field">
            <span>Marital status</span>
            <select name="marital" defaultValue={f.marital ?? ""}>
              <option value="">Any</option>
              {MARITAL_STATUS.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </label>
          <label className="check">
            <input type="checkbox" name="photo" value="1" defaultChecked={f.photo === "1"} />
            <span>Only profiles with a photo</span>
          </label>
          <div className="row">
            <button className="btn btn-gold btn-sm" style={{ flex: 1 }}>Apply</button>
            <Link className="btn btn-quiet btn-sm" href="/browse">Reset</Link>
          </div>
        </form>
      </div>
    </aside>
  );
}
