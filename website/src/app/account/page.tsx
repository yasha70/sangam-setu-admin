import type { Metadata } from "next";
import { AccountForms } from "@/components/AccountForms";
import { requireUser } from "@/lib/auth";
import { getBiodata, profileCode } from "@/lib/data";

export const metadata: Metadata = { title: "Account" };

export default async function AccountPage() {
  const user = await requireUser("/account");
  const bio = await getBiodata(user.id);
  return (
    <main className="wrap page stack" style={{ maxWidth: 760 }}>
      <div className="page-head" style={{ marginBottom: 0 }}>
        <div>
          <h1>Account</h1>
          <p>
            {bio?.fullName || user.name} · Profile ID <b>{profileCode(user.profileNo)}</b> · Log-in number +91 {user.phone}
          </p>
        </div>
      </div>
      <AccountForms published={Boolean(bio?.published)} />
    </main>
  );
}
