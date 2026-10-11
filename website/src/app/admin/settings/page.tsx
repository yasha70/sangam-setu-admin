import { SettingsForms } from "@/components/admin/SettingsForms";
import { requireAdmin } from "@/lib/admin";
import { contactsHidingOn, getAnnouncement, statTotals } from "@/lib/data";
import { sampleCount, samplesEnabled } from "@/lib/samples";

export const metadata = { title: "Settings" };

export default async function AdminSettings() {
  await requireAdmin();
  const [announcement, on, total, hiding, totals] = await Promise.all([getAnnouncement(), samplesEnabled(), sampleCount(), contactsHidingOn(true), statTotals()]);
  return (
    <div className="stack">
      <div className="page-head" style={{ marginBottom: 0 }}>
        <div>
          <h1>Settings</h1>
          <p>Site-wide switches. Changes apply to everyone straight away.</p>
        </div>
      </div>
      <SettingsForms announcement={announcement} samplesOn={on} sampleTotal={total} hidingOn={hiding} hiddenTotal={totals.contacts_hidden ?? 0} />
    </div>
  );
}
