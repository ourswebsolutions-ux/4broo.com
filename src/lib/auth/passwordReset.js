// Password-reset token lookup (server-only; not a Server Action, so it is not callable from the browser).
import "server-only";
import { getDb } from "../db.js";
import { hashToken } from "./tokens.js";

/** A usable reset token (unused, unexpired) for the raw token from the email link, or null. */
export async function findResetToken(token) {
  if (typeof token !== "string" || token.length < 20 || token.length > 128) return null;
  const row = await getDb().passwordResetToken.findUnique({
    where: { tokenHash: hashToken(token) },
    select: { id: true, userId: true, expiresAt: true, usedAt: true },
  });
  return row && !row.usedAt && row.expiresAt > new Date() ? row : null;
}
