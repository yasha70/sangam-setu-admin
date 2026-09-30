import { del } from "@vercel/blob";
import { withAdmin } from "@/lib/admin";
import { fail, ok, readJson } from "@/lib/api";
import { deleteAccount, getBiodata, getUser, saveBiodata, setSuspended } from "@/lib/data";

type Ctx = { params: Promise<{ id: string }> };

export const POST = withAdmin(async (req, ctx: Ctx) => {
  const { id } = await ctx.params;
  const { action } = await readJson(req);
  const [user, bio] = await Promise.all([getUser(id), getBiodata(id)]);
  if (!user || !bio) return fail("Member not found.", 404);
  if (bio.sample && action !== "verify" && action !== "unverify") return fail("Sample profiles are managed from Settings.", 400);

  switch (action) {
    case "verify":
    case "unverify":
      await saveBiodata(id, { verified: action === "verify" });
      return ok({ message: action === "verify" ? "Marked as verified." : "Verified tick removed." });
    case "hide":
      await saveBiodata(id, { adminHidden: true, published: false });
      return ok({ message: "Biodata hidden from browse. The member can't publish it until you unhide it." });
    case "unhide":
      await saveBiodata(id, { adminHidden: false });
      return ok({ message: "Unhidden. The member can publish their biodata again." });
    case "suspend":
      await setSuspended(id, true);
      return ok({ message: "Account suspended. They're logged out and can't log in." });
    case "restore":
      await setSuspended(id, false);
      return ok({ message: "Account restored. They can log in again." });
    case "delete": {
      const { bio: removed } = await deleteAccount(id);
      if (process.env.BLOB_READ_WRITE_TOKEN) {
        const blobs = (removed?.photos ?? []).filter((p) => p.includes(`/photos/${id}/`));
        if (blobs.length) await del(blobs).catch(() => undefined);
      }
      return ok({ message: "Account deleted.", deleted: true });
    }
    default:
      return fail("Unknown action.");
  }
});
