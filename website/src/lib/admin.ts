import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SignJWT, jwtVerify } from "jose";
import { createHash, timingSafeEqual } from "node:crypto";
import { sessionSecretMaterial } from "./kv";
import { errorResponse, fail } from "./api";

/*
 The admin panel is protected by one password, ADMIN_PASSWORD, set in the Vercel project's
 environment variables. Without it the admin panel stays switched off.
*/

const COOKIE = "ss_admin";
const MAX_AGE = 60 * 60 * 12;

export const adminEnabled = () => Boolean(process.env.ADMIN_PASSWORD);

function key() {
  return createHash("sha256").update(`admin:${sessionSecretMaterial()}:${process.env.ADMIN_PASSWORD ?? ""}`).digest();
}

export function checkAdminPassword(input: string) {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return false;
  const a = createHash("sha256").update(input).digest();
  const b = createHash("sha256").update(expected).digest();
  return timingSafeEqual(a, b);
}

export async function startAdminSession() {
  const token = await new SignJWT({ admin: true }).setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime(`${MAX_AGE}s`).sign(key());
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function endAdminSession() {
  (await cookies()).delete(COOKIE);
}

export async function isAdmin() {
  if (!adminEnabled()) return false;
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return false;
  try {
    const { payload } = await jwtVerify(token, key());
    return payload.admin === true;
  } catch {
    return false;
  }
}

export async function requireAdmin() {
  if (!(await isAdmin())) redirect("/admin/login");
}

/** Wraps an admin API route: requires the admin cookie and turns errors into JSON. */
export function withAdmin<A extends unknown[]>(handler: (req: Request, ...rest: A) => Promise<Response>) {
  return async (req: Request, ...rest: A) => {
    try {
      if (!(await isAdmin())) return fail("Admin login required.", 401);
      return await handler(req, ...rest);
    } catch (e) {
      return errorResponse(e);
    }
  };
}
