import { withAdmin } from "@/lib/admin";
import { ok, readJson } from "@/lib/api";
import { setAnnouncement } from "@/lib/data";
import { setSamplesEnabled } from "@/lib/samples";

export const POST = withAdmin(async (req) => {
  const body = await readJson(req);
  if (typeof body.announcement === "string") {
    await setAnnouncement(body.announcement);
    return ok({ message: body.announcement.trim() ? "Announcement is live for everyone." : "Announcement removed." });
  }
  if (typeof body.samples === "boolean") {
    await setSamplesEnabled(body.samples);
    return ok({ message: body.samples ? "Sample profiles are back." : "Sample profiles removed." });
  }
  return ok();
});
