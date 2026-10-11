import { withAdmin } from "@/lib/admin";
import { fail, ok, readJson } from "@/lib/api";
import { connectMembers, createTestPair, deleteTestPair, refreshLinks } from "@/lib/testing";

export const POST = withAdmin(async (req) => {
  const body = await readJson(req);
  switch (body.action) {
    case "create":
      await createTestPair();
      return ok({ message: "Two connected test accounts are ready." });
    case "refresh":
      return (await refreshLinks()) ? ok({ message: "New login links made. The old ones still work until they expire." }) : fail("Create the test accounts first.");
    case "delete":
      await deleteTestPair();
      return ok({ message: "Test accounts and their chats are deleted." });
    case "connect": {
      const res = await connectMembers(String(body.a ?? ""), String(body.b ?? ""));
      return "error" in res ? fail(res.error!) : ok({ message: res.message });
    }
    default:
      return fail("Unknown action.");
  }
});
