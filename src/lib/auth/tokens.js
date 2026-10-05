// Opaque random tokens (sessions, password resets, guest carts).
// Only an HMAC of the token is stored, keyed with AUTH_SECRET — a database leak
// alone can neither replay nor forge tokens.
import "server-only";
import { createHmac, randomBytes } from "node:crypto";
import { getAuthEnv } from "../env.js";

export function generateToken(bytes = 32) {
  return randomBytes(bytes).toString("base64url");
}

/** 64-char hex digest, matching the CHAR(64) token columns. */
export function hashToken(token) {
  return createHmac("sha256", getAuthEnv().AUTH_SECRET).update(token).digest("hex");
}
