import Link from "next/link";
import { MemberActions } from "@/components/admin/MemberActions";
import { StatusPills } from "@/components/admin/StatusPills";
import { BiodataView } from "@/components/BiodataView";
import { requireAdmin } from "@/lib/admin";
import { fmtDate } from "@/lib/adminData";
import { activityLabel, getBiodata, getUser, listInterestIds, profileCode, reportsAgainst, viewsFor } from "@/lib/data";

export const metadata = { title: "Member" };

export default async function AdminMember({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const [user, bio] = await Promise.all([getUser(id), getBiodata(id)]);
  if (!user || !bio) {
    return (
      <div className="card stack">
        <h1 style={{ margin: 0 }}>Member not found</h1>
        <Link className="btn btn-ghost" href="/admin/users">Back to members</Link>
      </div>
    );
  }
  const [ids, views, reports] = await Promise.all([listInterestIds(id), viewsFor(id), reportsAgainst(id)]);

  return (
    <div className="stack">
      <div className="row">
        <Link className="btn btn-quiet btn-sm" href="/admin/users">← All members</Link>
      </div>
      <div className="tiles">
        <div className="tile"><span>Profile ID</span><b style={{ fontSize: 24 }}>{profileCode(user.profileNo) || "—"}</b><small>{user.createdFor}</small></div>
        <div className="tile"><span>Mobile</span><b style={{ fontSize: 20 }}>+91 {user.phone || "—"}</b><small>used to log in</small></div>
        <div className="tile"><span>Joined</span><b style={{ fontSize: 20 }}>{fmtDate(user.createdAt)}</b><small>{activityLabel(user.lastActive) || "never active"}</small></div>
        <div className="tile"><span>Interests</span><b>{ids.sent.length}</b><small>sent · {ids.received.length} received</small></div>
        <div className="tile"><span>Connections</span><b>{ids.connected.length}</b><small>accepted</small></div>
        <div className="tile"><span>Profile views</span><b>{views.count}</b><small>all time</small></div>
      </div>
      <div className="row"><StatusPills user={user} bio={bio} /></div>

      {reports.length ? (
        <section className="card">
          <div className="card-head"><h2>Reports about this member</h2></div>
          <ul className="list" style={{ listStyle: "none" }}>
            {reports.map((r) => (
              <li key={r.id} className="list-row" style={{ boxShadow: "none" }}>
                <span className={`pill ${r.status === "open" ? "rose" : ""}`}>{r.status}</span>
                <b>{r.reason}</b>
                <span className="muted small" style={{ flex: 1 }}>{r.note || "No note"}</span>
                <span className="muted small">{fmtDate(r.ts)}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <MemberActions
        id={id}
        name={bio.fullName || user.name}
        verified={Boolean(bio.verified)}
        hidden={Boolean(bio.adminHidden)}
        suspended={user.status === "suspended"}
        sample={Boolean(bio.sample)}
      />

      <BiodataView bio={bio} canSeeContact isSelf />
    </div>
  );
}
