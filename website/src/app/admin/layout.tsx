import type { Metadata } from "next";
import { AdminNav } from "@/components/admin/AdminNav";
import { isAdmin } from "@/lib/admin";
import { listReports } from "@/lib/data";

export const metadata: Metadata = { title: { default: "Admin", template: "%s · Admin · Sangam Setu" }, robots: { index: false } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const open = (await isAdmin()) ? (await listReports("open")).length : 0;
  return (
    <main className="wrap page">
      <AdminNav openReports={open} />
      {children}
    </main>
  );
}
