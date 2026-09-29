import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthCard } from "@/components/AuthCard";

export const metadata: Metadata = { title: "Log in" };

export default function Page() {
  return (
    <main className="auth">
      <Suspense>
        <AuthCard initial="login" />
      </Suspense>
    </main>
  );
}
