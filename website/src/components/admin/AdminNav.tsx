"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const LINKS = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/users", label: "Members" },
  { href: "/admin/reports", label: "Reports" },
  { href: "/admin/settings", label: "Settings" },
];

export function AdminNav({ openReports }: { openReports: number }) {
  const pathname = usePathname();
  const router = useRouter();
  if (pathname === "/admin/login") return null;
  const active = (href: string) => (href === "/admin" ? pathname === "/admin" : pathname.startsWith(href) ? "page" : undefined);
  return (
    <nav className="admin-nav" aria-label="Admin">
      <span className="admin-tag">Admin</span>
      {LINKS.map((l) => (
        <Link key={l.href} href={l.href} aria-current={l.href === "/admin" ? (pathname === "/admin" ? "page" : undefined) : active(l.href)}>
          {l.label}
          {l.href === "/admin/reports" && openReports > 0 ? <span className="badge">{openReports}</span> : null}
        </Link>
      ))}
      <span className="spacer" />
      <button
        className="btn btn-quiet btn-sm"
        onClick={async () => {
          await fetch("/api/admin/logout", { method: "POST" });
          router.push("/admin/login");
          router.refresh();
        }}
      >
        Log out of admin
      </button>
    </nav>
  );
}
