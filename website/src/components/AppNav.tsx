"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Icon } from "./Icon";

const LINKS = [
  { href: "/browse", label: "Browse", icon: "search" },
  { href: "/interests", label: "Interests", icon: "heart", badge: "interests" as const },
  { href: "/chat", label: "Chats", icon: "chat", badge: "messages" as const },
  { href: "/biodata", label: "My biodata", short: "Biodata", icon: "doc" },
];

export function AppNav({ loggedIn }: { loggedIn: boolean }) {
  const pathname = usePathname();
  const router = useRouter();
  const [counts, setCounts] = useState({ interests: 0, messages: 0 });

  useEffect(() => {
    if (!loggedIn) return;
    let stop = false;
    const load = async () => {
      if (document.hidden) return;
      try {
        const res = await fetch("/api/summary", { cache: "no-store" });
        if (res.ok && !stop) setCounts(await res.json());
      } catch {
        // offline: keep the last counts
      }
    };
    load();
    const t = setInterval(load, 12000);
    return () => {
      stop = true;
      clearInterval(t);
    };
  }, [loggedIn, pathname]);

  if (pathname.startsWith("/admin")) {
    return (
      <div className="header-actions" style={{ marginLeft: "auto" }}>
        <Link className="btn btn-quiet btn-sm" href="/">Back to site</Link>
      </div>
    );
  }

  if (!loggedIn) {
    return (
      <div className="header-actions" style={{ marginLeft: "auto" }}>
        <Link className="btn btn-quiet" href="/login">Log in</Link>
        <Link className="btn btn-gold btn-sm" href="/signup">Create biodata</Link>
      </div>
    );
  }

  const active = (href: string) => (pathname === href || pathname.startsWith(href + "/") ? "page" : undefined);
  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  };

  return (
    <>
      <nav className="nav" aria-label="Main">
        {LINKS.map((l) => (
          <Link key={l.href} href={l.href} aria-current={active(l.href)}>
            <Icon name={l.icon} />
            {l.label}
            {l.badge && counts[l.badge] > 0 ? <span className="badge">{counts[l.badge]}</span> : null}
          </Link>
        ))}
      </nav>
      <div className="header-actions">
        <Link className="icon-btn" href="/account" aria-label="Account settings" title="Account settings">
          <Icon name="user" />
        </Link>
        <button className="icon-btn" onClick={logout} aria-label="Log out" title="Log out">
          <Icon name="logout" />
        </button>
      </div>
      <nav className="tabbar" aria-label="Main">
        {LINKS.map((l) => (
          <Link key={l.href} href={l.href} aria-current={active(l.href)}>
            <Icon name={l.icon} />
            {l.short ?? l.label}
            {l.badge && counts[l.badge] > 0 ? <span className="badge">{counts[l.badge]}</span> : null}
          </Link>
        ))}
      </nav>
    </>
  );
}
