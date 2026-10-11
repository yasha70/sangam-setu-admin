import { setPrivateNote } from "@/lib/data";
import { fail, ok, readJson, withUser } from "@/lib/api";

export const POST = withUser(async (uid, req) => {
  const body = await readJson(req);
  const id = String(body.id ?? "");
  if (!id || id === uid) return fail("Choose a profile.");
  const text = await setPrivateNote(uid, id, String(body.text ?? ""));
  return ok({ text });
});
