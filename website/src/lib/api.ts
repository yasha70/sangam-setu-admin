import "server-only";
import { NextResponse } from "next/server";
import { currentUserId } from "./auth";
import { DatabaseNotConfiguredError } from "./kv";

export const ok = (data: unknown = { ok: true }) => NextResponse.json(data);
export const fail = (message: string, status = 400) => NextResponse.json({ error: message }, { status });

/** Wraps a route handler: requires a signed-in user and turns errors into JSON responses. */
export function withUser<A extends unknown[]>(
  handler: (userId: string, req: Request, ...rest: A) => Promise<Response>,
) {
  return async (req: Request, ...rest: A) => {
    try {
      const uid = await currentUserId();
      if (!uid) return fail("Please log in again.", 401);
      return await handler(uid, req, ...rest);
    } catch (e) {
      return errorResponse(e);
    }
  };
}

export function errorResponse(e: unknown) {
  if (e instanceof DatabaseNotConfiguredError) return fail(e.message, 503);
  console.error(e);
  return fail("Something went wrong on our side. Please try again.", 500);
}

export async function readJson(req: Request): Promise<Record<string, unknown>> {
  try {
    const body = await req.json();
    return body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}
