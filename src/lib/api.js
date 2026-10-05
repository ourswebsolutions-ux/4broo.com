// Route Handler wrapper: consistent JSON envelopes, auth enforcement and error handling.
//
// Usage:
//   export const POST = apiHandler(async ({ request, user, params }) => {
//     const data = await validateJsonBody(request, schema);
//     return { created: true };            // → 200 { ok: true, data: {...} }
//   }, { auth: "admin" });
import "server-only";
import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { assertAdmin, assertUser } from "./auth/guards.js";
import { AppError, normalizeError, toPublicError } from "./errors.js";
import { logger } from "./logger.js";

const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

export function jsonOk(data, init) {
  return NextResponse.json({ ok: true, data }, init);
}

export function jsonError(appError, errorId) {
  const headers = {};
  if (appError.code === "RATE_LIMITED" && appError.details?.retryAfterSeconds) {
    headers["Retry-After"] = String(appError.details.retryAfterSeconds);
  }
  return NextResponse.json({ ok: false, error: toPublicError(appError, errorId) }, { status: appError.status, headers });
}

/**
 * Defence-in-depth CSRF check for cookie-authenticated mutations:
 * the Origin header (sent by all modern browsers on POST) must match the host.
 */
function assertSameOrigin(request) {
  const origin = request.headers.get("origin");
  if (!origin) return; // non-browser clients (server-to-server webhooks) authenticate differently
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  if (new URL(origin).host !== host) {
    throw new AppError("Cross-origin request blocked.", { status: 403, code: "FORBIDDEN" });
  }
}

/**
 * @param {(ctx: { request: Request, params: object, user: object | null }) => Promise<any>} handler
 * @param {{ auth?: "user" | "admin" | null, sameOrigin?: boolean }} options
 */
export function apiHandler(handler, { auth = null, sameOrigin = true } = {}) {
  return async function routeHandler(request, context) {
    try {
      if (sameOrigin && MUTATING_METHODS.has(request.method)) assertSameOrigin(request);

      const user = auth === "admin" ? await assertAdmin() : auth === "user" ? await assertUser() : null;
      const params = (await context?.params) ?? {};
      const result = await handler({ request, params, user });

      return result instanceof Response ? result : jsonOk(result ?? null);
    } catch (error) {
      const appError = normalizeError(error);
      const errorId = appError.status >= 500 ? randomUUID() : undefined;

      if (appError.status >= 500) {
        logger.error("API request failed", {
          errorId,
          method: request.method,
          path: new URL(request.url).pathname,
          error: error instanceof Error ? error : new Error(String(error)),
        });
      }

      return jsonError(appError, errorId);
    }
  };
}
