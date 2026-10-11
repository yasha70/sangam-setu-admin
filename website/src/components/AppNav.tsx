"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Icon, Silhouette } from "./Icon";
import { celebrate } from "./Interest";

type Counts = { interests: number; messages: number; notices: number; celebrate: { id: string; name: string; photo: string | null } | null };

const LINKS = [
  { href: "/home", label: "Home", icon: "home" },
  { href: "/discover", label: "Discover", icon: "compass" },
  { href: "/browse", label: "Search", icon: "search", desktopOnly: true },
  { href: "/interests", label: "Interests", icon: "heart", badge: "interests" as const },
  { href: "/chat", label: "Chats", icon: "chat", badge: "messages" as const },
  { href: "/biodata", label: "Me", icon: "user", mobileOnly: true },
];

export function AppNav({ loggedIn, me }: { loggedIn: boolean; me?: { id: string; name: string; photo: string | null } }) {
  const pathname = usePathname();
  const router = useRouter();
  const [counts, setCounts] = useState<Counts>({ interests: 0, messages: 0, notices: 0, celebrate: null });
  const shown = useRef(new Set<string>());
  const menu = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    if (!loggedIn) return;
    let stop = false;
    const load = async () => {
      if (document.hidden) return;
      try {
        const res = await fetch("/api/summary", { cache: "no-store" });
        if (!res.ok || stop) return;
        const data = (await res.json()) as Counts;
        setCounts(data);
        if (data.celebrate && !shown.current.has(data.celebrate.id)) {
          shown.current.add(data.celebrate.id);
          celebrate(data.celebrate);
        }
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

  useEffect(() => {
    if (menu.current) menu.current.open = false;
  }, [pathname]);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (menu.current?.open && !menu.current.contains(e.target as Node)) menu.current.open = false;
    };
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, []);

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
        <Link className="btn btn-quiet hide-xs" href="/kundli">Kundli match</Link>
        <Link className="btn btn-quiet" href="/login">Log in</Link>
        <Link className="btn btn-gold btn-sm" href="/signup">Create biodata</Link>
      </div>
    );
  }

  const active = (href: string) => (pathname === href || pathname.startsWith(href + "/") || (href === "/biodata" && pathname.startsWith("/account")) ? "page" : undefined);
  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  };
  const badge = (b?: "interests" | "messages") => (b && counts[b] > 0 ? <span className="badge">{counts[b] > 99 ? "99+" : counts[b]}</span> : null);

  return (
    <>
      <nav className="nav" aria-label="Main">
        {LINKS.filter((l) => !l.mobileOnly).map((l) => (
          <Link key={l.href} href={l.href} aria-current={active(l.href)}>
            <Icon name={l.icon} />
            {l.label}
            {badge(l.badge)}
          </Link>
        ))}
      </nav>
      <div className="header-actions">
        <Link className="icon-btn show-mobile" href="/browse" aria-label="Search profiles">
          <Icon name="search" />
        </Link>
        <Link className="icon-btn bell" href="/notifications" aria-label={`Notifications${counts.notices ? `, ${counts.notices} new` : ""}`} aria-current={active("/notifications")}>
          <Icon name="bell" />
          {counts.notices > 0 ? <span className="dot-badge">{counts.notices > 9 ? "9+" : counts.notices}</span> : null}
        </Link>
        <details className="me-menu" ref={menu}>
          <summary aria-label="Your menu">
            <span className="avatar xs">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {me?.photo ? <img src={me.photo} alt="" /> : <Silhouette />}
            </span>
          </summary>
          <div className="menu" role="menu">
            <div className="menu-head">
              <b>{me?.name ?? "You"}</b>
              <span>Signed in</span>
            </div>
            <Link role="menuitem" href="/biodata"><Icon name="doc" />My biodata</Link>
            <Link role="menuitem" href="/biodata/edit"><Icon name="edit" />Edit biodata</Link>
            <Link role="menuitem" href="/family"><Icon name="family" />Parivar panel</Link>
            <Link role="menuitem" href="/kundli"><Icon name="moon" />Kundli match</Link>
            <Link role="menuitem" href="/account"><Icon name="lock" />Account</Link>
            <button role="menuitem" onClick={logout}><Icon name="logout" />Log out</button>
          </div>
        </details>
      </div>
      <nav className="tabbar" aria-label="Main">
        {LINKS.filter((l) => !l.desktopOnly).map((l) => (
          <Link key={l.href} href={l.href} aria-current={active(l.href)}>
            <Icon name={l.icon} />
            {l.label}
            {badge(l.badge)}
          </Link>
        ))}
      </nav>
    </>
  );
}
