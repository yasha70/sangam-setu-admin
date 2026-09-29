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
import { Toaster } from "@/components/Toaster";
import { Lotus } from "@/components/Icon";
import { currentUser } from "@/lib/auth";
import { isDatabaseConfigured } from "@/lib/kv";

export const metadata: Metadata = {
  title: { default: "Sangam Setu", template: "%s · Sangam Setu" },
  description:
    "Create your marriage biodata, browse profiles from your community, chat once both sides accept, and download a beautifully designed PDF.",
  icons: { icon: "/favicon.svg" },
};

export const viewport: Viewport = {
  themeColor: "#111b21",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  await cookies(); // every page depends on who is logged in
  const dbReady = isDatabaseConfigured();
  const user = dbReady ? await currentUser().catch(() => null) : null;

  return (
    <html lang="en">
      <body>
        <header className="app-header">
          <div className="wrap">
            <Link className="logo" href="/" aria-label="Sangam Setu home">
              <Lotus />
              <b>Sangam Setu</b>
            </Link>
            <AppNav loggedIn={Boolean(user)} />
          </div>
        </header>
        {dbReady ? children : <SetupNotice />}
        <Toaster />
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
