import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";
import "@fontsource/inter/700.css";
import "@fontsource/rozha-one/400.css";
import "./globals.css";
import { AppNav } from "@/components/AppNav";
import { Celebrate, InterestSheet } from "@/components/Interest";
import { Toaster } from "@/components/Toaster";
import { Lotus } from "@/components/Icon";
import { currentUser } from "@/lib/auth";
import { isDatabaseConfigured } from "@/lib/kv";
import { getAnnouncement, getBiodata } from "@/lib/data";

export const metadata: Metadata = {
  title: { default: "Sangam Setu · Matrimony for families", template: "%s · Sangam Setu" },
  description:
    "Free matrimony for Indian families: a beautiful biodata, matches that explain themselves, free Guna Milan, a family review panel, and chat once both sides say yes.",
  icons: { icon: "/favicon.svg", apple: "/icons/apple-touch-icon.png" },
  appleWebApp: { capable: true, title: "Sangam Setu", statusBarStyle: "black-translucent" },
  applicationName: "Sangam Setu",
};

export const viewport: Viewport = {
  themeColor: "#9e0038",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  await cookies(); // every page depends on who is logged in
  const dbReady = isDatabaseConfigured();
  const user = dbReady ? await currentUser().catch(() => null) : null;
  const announcement = dbReady ? await getAnnouncement().catch(() => "") : "";
  const myBio = user ? await getBiodata(user.id).catch(() => null) : null;
  const me = user ? { id: user.id, name: myBio?.fullName ?? user.name, photo: myBio?.photos[0] ?? null } : undefined;

  return (
    <html lang="en">
      <body>
        <header className="app-header">
          <div className="wrap">
            <Link className="logo" href="/" aria-label="Sangam Setu home">
              <Lotus />
              <b>Sangam Setu</b>
            </Link>
            <AppNav loggedIn={Boolean(user)} me={me} />
          </div>
        </header>
        {announcement ? <div className="announce" role="status">{announcement}</div> : null}
        {dbReady ? children : <SetupNotice />}
        <Toaster />
        {me ? (
          <>
            <InterestSheet />
            <Celebrate me={{ name: me.name, photo: me.photo }} />
          </>
        ) : null}
      </body>
    </html>
  );
}

function SetupNotice() {
  return (
    <main className="auth">
      <div className="card stack">
        <p className="eyebrow">Almost ready</p>
        <h1>Connect the database</h1>
        <p className="muted">
          Sangam Setu keeps accounts, biodatas and chats in Upstash Redis. In the Vercel dashboard, open{" "}
          <b>Storage</b>, choose your existing <b>Upstash Redis</b> database (or create one), click{" "}
          <b>Connect Project</b> and pick <b>sangam-setu</b>. Then redeploy.
        </p>
      </div>
    </main>
  );
}
