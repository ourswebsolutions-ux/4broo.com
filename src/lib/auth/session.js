// Database-backed sessions stored in an HttpOnly cookie.
//
// Why not stateless JWTs: sessions here can be revoked instantly (logout,
// suspension, role change, "sign out everywhere"), which matters for admins.
import "server-only";
import { cache } from "react";
import { cookies, headers } from "next/headers";
import { authConfig } from "../../config/server.js";
import { getDb } from "../db.js";
import { generateToken, hashToken } from "./tokens.js";

const SAFE_USER_FIELDS = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  role: true,
  status: true,
};

function cookieOptions(expiresAt) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  };
}

/** Create a session for a user and set the cookie. Call only from Server Actions / Route Handlers. */
export async function createSession(user) {
  const token = generateToken();
  const expiresAt = new Date(Date.now() + authConfig.sessionTtlMs[user.role]);
  const requestHeaders = await headers();

  await getDb().session.create({
    data: {
      tokenHash: hashToken(token),
      userId: user.id,
      expiresAt,
      ipAddress: getClientIp(requestHeaders)?.slice(0, 45) ?? null,
      userAgent: requestHeaders.get("user-agent")?.slice(0, 255) ?? null,
    },
  });

  const cookieStore = await cookies();
  cookieStore.set(authConfig.sessionCookieName, token, cookieOptions(expiresAt));
}

/** Delete the current session (server + cookie). */
export async function destroySession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(authConfig.sessionCookieName)?.value;

  if (token) {
    await getDb().session.deleteMany({ where: { tokenHash: hashToken(token) } });
  }
  cookieStore.delete(authConfig.sessionCookieName);
}

/** Revoke every session for a user (password change, suspension, role change). */
export async function destroyAllSessionsForUser(userId) {
  await getDb().session.deleteMany({ where: { userId } });
}

/**
 * Resolve the signed-in user for this request, or null.
 * Memoised per request with React `cache`, so layouts/pages/actions can all call it freely.
 */
export const getCurrentUser = cache(async () => {
  const cookieStore = await cookies();
  const token = cookieStore.get(authConfig.sessionCookieName)?.value;
  if (!token || token.length > 128) return null;

  const session = await getDb().session.findUnique({
    where: { tokenHash: hashToken(token) },
    select: { id: true, expiresAt: true, user: { select: SAFE_USER_FIELDS } },
  });

  if (!session) return null;

  if (session.expiresAt <= new Date()) {
    await getDb().session.delete({ where: { id: session.id } }).catch(() => {});
    return null;
  }

  if (session.user.status !== "ACTIVE") return null;

  return session.user;
});

/**
 * Client IP as reported by the reverse proxy (Nginx, Vercel, Cloudflare…).
 * Only trustworthy when the app is reachable exclusively through that proxy,
 * which must overwrite — not append to — client-supplied X-Forwarded-For.
 */
export function getClientIp(requestHeaders) {
  const forwarded = requestHeaders.get("x-forwarded-for");
  return forwarded ? forwarded.split(",")[0].trim() : requestHeaders.get("x-real-ip");
}

/** Housekeeping — call from a scheduled job. */
export async function deleteExpiredSessions() {
  const { count } = await getDb().session.deleteMany({ where: { expiresAt: { lte: new Date() } } });
  return count;
}
