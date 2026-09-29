import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthCard } from "@/components/AuthCard";

export const metadata: Metadata = { title: "Create account" };

export default function Page() {
  return (
    <main className="auth">
      <Suspense>
        <AuthCard initial="signup" />
      </Suspense>
    </main>
  );
}
