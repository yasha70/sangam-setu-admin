import Link from "next/link";
import { ReportActions } from "@/components/admin/ReportActions";
import { requireAdmin } from "@/lib/admin";
import { fmtDate } from "@/lib/adminData";
import { getBiodatas, listReports, profileCode } from "@/lib/data";

export const metadata = { title: "Reports" };

export default async function AdminReports({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  await requireAdmin();
  const { tab } = await searchParams;
  const which = tab === "closed" ? "closed" : "open";
  const reports = await listReports(which);
  const ids = [...new Set(reports.flatMap((r) => [r.target, r.from]))];
  const bios = await getBiodatas(ids);
  const byId = new Map(ids.map((id, i) => [id, bios[i]]));
  const name = (id: string) => byId.get(id)?.fullName ?? "Deleted member";

  return (
    <div className="stack">
      <div className="page-head" style={{ marginBottom: 0 }}>
        <div>
          <h1>Reports</h1>
          <p>Members report profiles that look fake, wrong or abusive. Dismiss a report, or suspend the account.</p>
        </div>
      </div>
      <nav className="seg" aria-label="Reports">
        <Link href="/admin/reports" aria-current={which === "open" ? "page" : undefined}>Open</Link>
        <Link href="/admin/reports?tab=closed" aria-current={which === "closed" ? "page" : undefined}>Closed</Link>
      </nav>
      {reports.length ? (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr><th>Reported profile</th><th>Reason</th><th>Note</th><th>Reported by</th><th>Date</th><th>{which === "open" ? "Decide" : "Outcome"}</th></tr>
            </thead>
            <tbody>
              {reports.map((r) => (
                <tr key={r.id}>
                  <td>
                    <Link className="who" href={`/admin/users/${r.target}`}>{name(r.target)}</Link>
                    <span className="muted small">{profileCode(byId.get(r.target)?.profileNo)}</span>
                  </td>
                  <td><span className="pill rose">{r.reason}</span></td>
                  <td style={{ maxWidth: 320 }}>{r.note || <span className="muted">No note</span>}</td>
                  <td><Link href={`/admin/users/${r.from}`}>{name(r.from)}</Link></td>
                  <td className="num">{fmtDate(r.ts)}</td>
                  <td>{which === "open" ? <ReportActions id={r.id} /> : <span className="pill">{r.status === "actioned" ? "Account suspended" : "Dismissed"}</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="card empty">
          <h3>{which === "open" ? "No open reports" : "No closed reports yet"}</h3>
          <p>{which === "open" ? "When a member reports a profile, it appears here." : "Reports you dismiss or act on move here."}</p>
        </div>
      )}
    </div>
  );
}
