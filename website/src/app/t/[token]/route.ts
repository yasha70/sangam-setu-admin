import { NextResponse } from "next/server";
import { startSession } from "@/lib/auth";
import { getTestPair, testLoginUser } from "@/lib/testing";

type Ctx = { params: Promise<{ token: string }> };

/** One-tap login for a test account (Admin → Testing). Opens the chat with the other test account. */
export async function GET(req: Request, ctx: Ctx) {
  const { token } = await ctx.params;
  const user = await testLoginUser(token);
  if (!user) return NextResponse.redirect(new URL("/login?test=expired", req.url));
  await startSession(user.id);
  const pair = await getTestPair();
  const other = pair ? (pair.a.id === user.id ? pair.b.id : pair.b.id === user.id ? pair.a.id : null) : null;
  return NextResponse.redirect(new URL(other ? `/chat/${other}` : "/chat", req.url));
}
