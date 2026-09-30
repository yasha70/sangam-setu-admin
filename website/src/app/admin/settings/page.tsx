import { SettingsForms } from "@/components/admin/SettingsForms";
import { requireAdmin } from "@/lib/admin";
import { getAnnouncement } from "@/lib/data";
import { sampleCount, samplesEnabled } from "@/lib/samples";

export const metadata = { title: "Settings" };

export default async function AdminSettings() {
  await requireAdmin();
  const [announcement, on, total] = await Promise.all([getAnnouncement(), samplesEnabled(), sampleCount()]);
  return (
    <div className="stack">
      <div className="page-head" style={{ marginBottom: 0 }}>
        <div>
          <h1>Settings</h1>
          <p>Site-wide switches. Changes apply to everyone straight away.</p>
        </div>
      </div>
      <SettingsForms announcement={announcement} samplesOn={on} sampleTotal={total} />
    </div>
  );
}
