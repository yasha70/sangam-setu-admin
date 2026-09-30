import { withAdmin } from "@/lib/admin";
import { fail, ok, readJson } from "@/lib/api";
import { closeReport, setSuspended } from "@/lib/data";

type Ctx = { params: Promise<{ id: string }> };

export const POST = withAdmin(async (req, ctx: Ctx) => {
  const { id } = await ctx.params;
  const { action } = await readJson(req);
  if (action === "dismiss") {
    const r = await closeReport(id, "dismissed");
    return r ? ok({ message: "Report dismissed." }) : fail("Report not found.", 404);
  }
  if (action === "suspend") {
    const r = await closeReport(id, "actioned");
    if (!r) return fail("Report not found.", 404);
    await setSuspended(r.target, true);
    return ok({ message: "Reported account suspended." });
  }
  return fail("Unknown action.");
});
