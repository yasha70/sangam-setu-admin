import { canChat, setTyping } from "@/lib/data";
import { fail, ok, withUser } from "@/lib/api";

type Ctx = { params: Promise<{ id: string }> };

export const POST = withUser(async (uid, _req, ctx: Ctx) => {
  const { id } = await ctx.params;
  if (!(await canChat(uid, id))) return fail("Chat not open.", 403);
  await setTyping(uid, id);
  return ok();
});
