import { Gallery } from "./Gallery";
import { Icon, VerifiedTick } from "./Icon";
import { ageFrom } from "@/lib/bio";
import type { Biodata, BiodataTextField } from "@/lib/types";

type Row = [string, string | undefined];

function shortHeight(h?: string) {
  return h ? h.replace(/\s*\(.*\)$/, "") : undefined;
}

function formatDob(dob?: string) {
  if (!dob) return undefined;
  const d = new Date(dob + "T00:00:00");
  return Number.isNaN(d.getTime()) ? dob : d.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
}

function KV({ rows }: { rows: Row[] }) {
  const filled = rows.filter((r): r is [string, string] => Boolean(r[1]));
  if (!filled.length) return <p className="muted small">Not filled in yet.</p>;
  return (
    <dl className="kv">
      {filled.map(([k, v]) => (
        <div key={k}>
          <dt>{k}</dt>
          <dd>{v}</dd>
        </div>
      ))}
    </dl>
  );
}

export function BiodataView({
  bio,
  canSeeContact,
  isSelf,
  actions,
  activity,
}: {
  bio: Biodata;
  canSeeContact: boolean;
  isSelf: boolean;
  actions?: React.ReactNode;
  activity?: string;
}) {
  const v = (k: BiodataTextField) => bio[k]?.trim() || undefined;
  const age = ageFrom(v("dob"));
  const place = [v("city"), v("state")].filter(Boolean).join(", ");
  const hasHoroscope = ["birthTime", "birthPlace", "manglik", "rashi", "nakshatra"].some((k) => v(k as BiodataTextField));

  return (
    <div className="profile">
      <Gallery photos={bio.photos} name={v("fullName") ?? "Profile photo"} />

      <div className="stack">
        <div>
          <h1 className="profile-name row" style={{ gap: 12 }}>
            {v("fullName") ?? "Unnamed"}
            {bio.verified ? <VerifiedTick /> : null}
          </h1>
          <div className="facts">
            {bio.profileNo ? <span className="pill peacock">ID SS{bio.profileNo}</span> : null}
            {activity ? (
              <span className="pill ok">
                {activity === "Online" ? <span className="online-dot" /> : null}
                {activity}
              </span>
            ) : null}
            {bio.verified ? <span className="pill peacock">Verified</span> : null}
            {age !== null ? <span className="pill">{age} years</span> : null}
            {shortHeight(v("height")) ? <span className="pill">{shortHeight(v("height"))}</span> : null}
            {place ? <span className="pill"><Icon name="pin" />{place}</span> : null}
            {v("occupation") ? <span className="pill"><Icon name="bag" />{v("occupation")}</span> : null}
            {v("education") ? <span className="pill"><Icon name="cap" />{v("education")}</span> : null}
            {v("community") || v("caste") ? <span className="pill gold">{[v("community"), v("caste")].filter(Boolean).join(", ")}</span> : null}
            {v("maritalStatus") ? <span className="pill">{v("maritalStatus")}</span> : null}
          </div>
        </div>

        {actions}

        {v("about") || v("hobbies") ? (
          <section className="card">
            <div className="card-head"><h2>About</h2></div>
            {v("about") ? <p className="prose">{v("about")}</p> : null}
            {v("hobbies") ? <p className="prose" style={{ marginTop: 8 }}><b style={{ color: "var(--ink)" }}>Hobbies:</b> {v("hobbies")}</p> : null}
          </section>
        ) : null}

        <section className="card">
          <div className="card-head"><h2>Personal details</h2></div>
          <KV
            rows={[
              ["Date of birth", formatDob(v("dob"))],
              ["Height", v("height")],
              ["Weight", v("weight")],
              ["Marital status", v("maritalStatus")],
              ["Religion", v("religion")],
              ["Mother tongue", v("motherTongue")],
              ["Community", v("community")],
              ["Caste", v("caste")],
              ["Sub-caste", v("subCaste")],
              ["Gotra", v("gotra")],
              ["Diet", v("diet")],
              ["Blood group", v("bloodGroup")],
              ["Lives in", place || undefined],
            ]}
          />
        </section>

        {hasHoroscope ? (
          <section className="card">
            <div className="card-head"><h2>Horoscope</h2></div>
            <KV
              rows={[
                ["Time of birth", v("birthTime")],
                ["Place of birth", v("birthPlace")],
                ["Manglik", v("manglik")],
                ["Rashi", v("rashi")],
                ["Nakshatra", v("nakshatra")],
              ]}
            />
          </section>
        ) : null}

        <section className="card">
          <div className="card-head"><h2>Education and career</h2></div>
          <KV
            rows={[
              ["Education", v("education")],
              ["College", v("college")],
              ["Works in", v("sector")],
              ["Occupation", v("occupation")],
              ["Company", v("employer")],
              ["Annual income", v("income")],
              ["Work location", v("workCity")],
            ]}
          />
        </section>

        <section className="card">
          <div className="card-head"><h2>Family</h2></div>
          <KV
            rows={[
              ["Father", [v("fatherName"), v("fatherOccupation")].filter(Boolean).join(", ") || undefined],
              ["Mother", [v("motherName"), v("motherOccupation")].filter(Boolean).join(", ") || undefined],
              ["Brothers", v("brothers")],
              ["Sisters", v("sisters")],
              ["Family type", v("familyType")],
              ["Native place", v("nativePlace")],
            ]}
          />
        </section>

        {v("expectations") ? (
          <section className="card">
            <div className="card-head"><h2>Partner expectations</h2></div>
            <p className="prose">{v("expectations")}</p>
          </section>
        ) : null}

        <section className="card">
          <div className="card-head">
            <h2>Contact</h2>
            {isSelf ? <p>Shown only to people you&apos;ve connected with</p> : null}
          </div>
          {canSeeContact ? (
            <KV
              rows={[
                ["Contact person", [v("contactName"), v("contactRelation")].filter(Boolean).join(", ") || undefined],
                ["Mobile", v("contactPhone") ? `+91 ${v("contactPhone")}` : undefined],
                ["Email", v("contactEmail")],
                ...(isSelf ? ([["Address (private)", v("address")]] as Row[]) : []),
              ]}
            />
          ) : (
            <p className="locked">
              <Icon name="lock" />
              Contact details appear here once your interest is accepted, or you accept theirs.
            </p>
          )}
        </section>
      </div>
    </div>
  );
}
