// Fixed-window rate limiter for sensitive endpoints (login, registration, password reset).
//
// NOTE: state is kept in process memory, which is correct for a single Node
// server. If the app is scaled to multiple instances, swap the store for a
// shared one (e.g. Redis) behind the same `rateLimit` interface.
import "server-only";
import { RateLimitError } from "../errors.js";

const buckets = new Map();
const MAX_BUCKETS = 50_000;

function sweep(now) {
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

/** Throws RateLimitError once `limit` hits occur for `key` within `windowMs`. */
export function rateLimit(key, { limit, windowMs }) {
  const now = Date.now();
  if (buckets.size > MAX_BUCKETS) sweep(now);

  let bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    bucket = { count: 0, resetAt: now + windowMs };
    buckets.set(key, bucket);
  }

  bucket.count += 1;
  if (bucket.count > limit) {
    throw new RateLimitError(undefined, Math.ceil((bucket.resetAt - now) / 1000));
  }
}

export function resetRateLimit(key) {
  buckets.delete(key);
}
