import Link from "next/link";
import { BarChart } from "@/components/admin/BarChart";
import { StatusPills } from "@/components/admin/StatusPills";
import { Silhouette } from "@/components/Icon";
import { adminEnabled, requireAdmin } from "@/lib/admin";
import { fmtDate, loadMembers } from "@/lib/adminData";
import { dailyStat, listReports, profileCode, statTotals } from "@/lib/data";
import { sampleCount } from "@/lib/samples";

export default async function AdminDashboard() {
  if (!adminEnabled()) return <AdminOff />;
  await requireAdmin();
  const [members, totals, signups, messages, reports, samples] = await Promise.all([
    loadMembers(),
    statTotals(),
    dailyStat("signups"),
    dailyStat("messages"),
    listReports("open"),
    sampleCount(),
  ]);
  const week = Date.now() - 7 * 86400_000;
  const count = (f: (m: (typeof members)[number]) => boolean) => members.filter(f).length;
  const tiles: [string, number, string][] = [
    ["Members", members.length, `${count((m) => m.user.createdAt > week)} joined this week`],
    ["Brides", count((m) => m.user.gender === "female"), "profiles of brides"],
    ["Grooms", count((m) => m.user.gender === "male"), "profiles of grooms"],
    ["Published", count((m) => Boolean(m.bio?.published)), "visible in browse"],
    ["Verified", count((m) => Boolean(m.bio?.verified)), "green tick"],
    ["Active this week", count((m) => (m.user.lastActive ?? 0) > week), "logged in or used the app"],
    ["Interests sent", totals.interests, "all time"],
    ["Connections", totals.connections, "accepted interests"],
    ["Messages", totals.messages, "all time"],
    ["Open reports", reports.length, reports.length ? "need a decision" : "nothing waiting"],
    ["Suspended", count((m) => m.user.status === "suspended"), "can't log in"],
    ["Sample profiles", samples, samples ? "shown in browse" : "switched off"],
  ];

  return (
    <div className="stack" style={{ gap: 20 }}>
      <div className="page-head" style={{ marginBottom: 0 }}>
        <div>
          <h1>Dashboard</h1>
          <p>How Sangam Setu is doing today.</p>
        </div>
      </div>

      <div className="tiles">
        {tiles.map(([label, value, note]) => (
          <div className="tile" key={label}>
            <span>{label}</span>
            <b>{value}</b>
            <small>{note}</small>
          </div>
        ))}
      </div>

      <div className="charts">
        <BarChart title="New members" data={signups} unit="sign-ups" />
        <BarChart title="Chat messages" data={messages} unit="messages" />
      </div>

      <section className="card">
        <div className="card-head">
          <h2>Newest members</h2>
          <Link className="btn btn-ghost btn-sm" href="/admin/users">All members</Link>
        </div>
        <div className="table-wrap" style={{ border: 0 }}>
          <table className="table">
            <thead>
              <tr><th>Member</th><th>ID</th><th>Mobile</th><th>City</th><th>Joined</th><th>Status</th></tr>
            </thead>
            <tbody>
              {members.slice(0, 8).map(({ user, bio }) => (
                <tr key={user.id}>
                  <td>
                    <Link className="who" href={`/admin/users/${user.id}`}>
                      <span className="avatar sm">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        {bio?.photos[0] ? <img src={bio.photos[0]} alt="" /> : <Silhouette />}
                      </span>
                      {bio?.fullName || user.name}
                    </Link>
                  </td>
                  <td className="num">{profileCode(user.profileNo)}</td>
                  <td className="num">+91 {user.phone}</td>
                  <td>{bio?.city || "—"}</td>
                  <td className="num">{fmtDate(user.createdAt)}</td>
                  <td><StatusPills user={user} bio={bio} /></td>
                </tr>
              ))}
              {!members.length ? (
                <tr><td colSpan={6} className="muted">No members yet.</td></tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function AdminOff() {
  return (
    <div className="card stack" style={{ maxWidth: 560 }}>
      <h1 style={{ margin: 0 }}>Admin panel is switched off</h1>
      <p className="muted">
        Add an environment variable named <b>ADMIN_PASSWORD</b> to the sangam-setu project in Vercel, then redeploy.
        That password opens this panel.
      </p>
    </div>
  );
}
