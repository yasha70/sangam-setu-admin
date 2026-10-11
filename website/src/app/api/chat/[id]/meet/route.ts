import { canChat, respondMeet } from "@/lib/data";
import { fail, ok, readJson, withUser } from "@/lib/api";

type Ctx = { params: Promise<{ id: string }> };

export const POST = withUser(async (uid, req, ctx: Ctx) => {
  const { id } = await ctx.params;
  if (!(await canChat(uid, id))) return fail("Chat not open.", 403);
  const body = await readJson(req);
  const message = await respondMeet(uid, id, String(body.mid ?? ""), Boolean(body.accept));
  if (!message) return fail("This meeting has already been answered.", 409);
  return ok({ message });
});
