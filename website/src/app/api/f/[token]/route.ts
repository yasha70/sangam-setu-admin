import { addFamilyVote, familyList, familyOwner } from "@/lib/data";
import { errorResponse, fail, ok, readJson } from "@/lib/api";
import { kv } from "@/lib/kv";
import type { FamilyReaction } from "@/lib/types";

type Ctx = { params: Promise<{ token: string }> };

/** Family members react to a profile on a member's review link. No account needed: the link is the key. */
export async function POST(req: Request, ctx: Ctx) {
  try {
    const { token } = await ctx.params;
    const owner = await familyOwner(token);
    if (!owner) return fail("This family link has expired. Ask for a new one.", 404);
    if ((await kv().incr(`rl:fam:${token}`, 3600)) > 150) return fail("Too many reactions for now. Try again in an hour.", 429);
    const body = await readJson(req);
    const name = String(body.name ?? "").trim();
    if (!name) return fail("Tell us your name first, like Mummy or Chachu.");
    const profile = String(body.profile ?? "");
    const list = await familyList(owner);
    if (!list.some((i) => i.bio.userId === profile)) return fail("This profile isn't on the list any more.", 404);
    const votes = await addFamilyVote(owner, profile, {
      name,
      reaction: String(body.reaction ?? "") as FamilyReaction,
      comment: typeof body.comment === "string" ? body.comment : undefined,
    });
    if (!votes) return fail("Choose a reaction.");
    return ok({ votes });
  } catch (e) {
    return errorResponse(e);
  }
}
