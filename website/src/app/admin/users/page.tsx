import Link from "next/link";
import { StatusPills } from "@/components/admin/StatusPills";
import { Silhouette } from "@/components/Icon";
import { requireAdmin } from "@/lib/admin";
import { fmtDate, loadMembers } from "@/lib/adminData";
import { activityLabel, profileCode } from "@/lib/data";

export const metadata = { title: "Members" };

const FILTERS = [
  { id: "all", label: "All" },
  { id: "brides", label: "Brides" },
  { id: "grooms", label: "Grooms" },
  { id: "published", label: "Published" },
  { id: "draft", label: "Drafts" },
  { id: "verified", label: "Verified" },
  { id: "unverified", label: "Not verified" },
  { id: "suspended", label: "Suspended" },
];

export default async function AdminUsers({ searchParams }: { searchParams: Promise<{ q?: string; f?: string }> }) {
  await requireAdmin();
  const { q = "", f = "all" } = await searchParams;
  const members = await loadMembers();
  const needle = q.trim().toLowerCase().replace(/^ss/, "");
  const rows = members.filter(({ user, bio }) => {
    if (f === "brides" && user.gender !== "female") return false;
    if (f === "grooms" && user.gender !== "male") return false;
    if (f === "published" && !bio?.published) return false;
    if (f === "draft" && bio?.published) return false;
    if (f === "verified" && !bio?.verified) return false;
    if (f === "unverified" && (bio?.verified || !bio?.published)) return false;
    if (f === "suspended" && user.status !== "suspended") return false;
    if (!needle) return true;
    return [bio?.fullName, user.name, user.phone, bio?.city, bio?.community, bio?.caste, String(user.profileNo ?? "")]
      .some((x) => (x ?? "").toLowerCase().includes(needle));
  });

  return (
    <div className="stack">
      <div className="page-head" style={{ marginBottom: 0 }}>
        <div>
          <h1>Members</h1>
          <p>{rows.length} of {members.length} members. Open a member to verify, hide, suspend or delete them.</p>
        </div>
      </div>
      <form className="filterbar" method="get">
        <input name="q" defaultValue={q} placeholder="Name, mobile, city, community or SS ID" aria-label="Search members" />
        <input type="hidden" name="f" value={f} />
        <button className="btn btn-gold btn-sm">Search</button>
      </form>
      <nav className="seg" aria-label="Filter members">
        {FILTERS.map((x) => (
          <Link key={x.id} href={`/admin/users?f=${x.id}${q ? `&q=${encodeURIComponent(q)}` : ""}`} aria-current={f === x.id ? "page" : undefined}>
            {x.label}
          </Link>
        ))}
      </nav>
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr><th>Member</th><th>ID</th><th>Mobile</th><th>Profile for</th><th>City</th><th>Joined</th><th>Last active</th><th>Status</th></tr>
          </thead>
          <tbody>
            {rows.map(({ user, bio }) => (
              <tr key={user.id}>
                <td>
                  <Link className="who" href={`/admin/users/${user.id}`}>
                    <span className="avatar sm">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      {bio?.photos[0] ? <img src={bio.photos[0]} alt="" /> : <Silhouette />}
                    </span>
                    <span>
                      {bio?.fullName || user.name}
                      <span className="muted small" style={{ display: "block", fontWeight: 500 }}>{user.gender === "female" ? "Bride" : "Groom"}</span>
                    </span>
                  </Link>
                </td>
                <td className="num">{profileCode(user.profileNo)}</td>
                <td className="num">+91 {user.phone}</td>
                <td>{user.createdFor}</td>
                <td>{[bio?.city, bio?.state].filter(Boolean).join(", ") || "—"}</td>
                <td className="num">{fmtDate(user.createdAt)}</td>
                <td className="num">{activityLabel(user.lastActive) || "—"}</td>
                <td><StatusPills user={user} bio={bio} /></td>
              </tr>
            ))}
            {!rows.length ? <tr><td colSpan={8} className="muted">No members match.</td></tr> : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
