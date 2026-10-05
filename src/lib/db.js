// Prisma client singleton (MySQL/MariaDB through the official MariaDB driver adapter).
// A single instance is reused across hot reloads in development to avoid exhausting connections.
import "server-only";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "../generated/prisma/client.ts";
import { getDatabaseEnv } from "./env.js";

function parseDatabaseUrl(databaseUrl, connectionLimit) {
  const url = new URL(databaseUrl);
  const ssl = url.searchParams.get("ssl");

  return {
    host: url.hostname,
    port: url.port ? Number(url.port) : 3306,
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: url.pathname.replace(/^\//, ""),
    connectionLimit,
    ...(ssl === "true" && { ssl: { rejectUnauthorized: true } }),
  };
}

function createPrismaClient() {
  const { DATABASE_URL, DATABASE_CONNECTION_LIMIT } = getDatabaseEnv();
  const adapter = new PrismaMariaDb(parseDatabaseUrl(DATABASE_URL, DATABASE_CONNECTION_LIMIT));

  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });
}

const globalForPrisma = globalThis;

/**
 * Lazily created so that importing this module never fails at build time
 * when DATABASE_URL is not available.
 */
export function getDb() {
  if (!globalForPrisma.__4broPrisma) {
    globalForPrisma.__4broPrisma = createPrismaClient();
  }
  return globalForPrisma.__4broPrisma;
}

/**
 * Run several writes atomically. Every multi-step operation (order placement:
 * order + items + payment + stock decrement; moving cart items to "saved") MUST
 * use this so a failure part-way rolls everything back.
 *
 *   await withTransaction(async (tx) => {
 *     const order = await tx.order.create({ … });
 *     await decrementVariantStock(tx, variantId, quantity); // throws → full rollback
 *   });
 *
 * Defaults: REPEATABLE READ (InnoDB default), 5 s to acquire a connection, 15 s max runtime.
 */
export function withTransaction(callback, { isolationLevel = "RepeatableRead", maxWait = 5000, timeout = 15000 } = {}) {
  return getDb().$transaction(callback, { isolationLevel, maxWait, timeout });
}

/**
 * withTransaction + automatic retry when InnoDB aborts the transaction because of a
 * write conflict or deadlock (Prisma P2034) — expected under contention, e.g. two
 * customers buying the last unit. The retried attempt re-reads current data, so the
 * loser then fails with a normal business error ("out of stock") instead of a 500.
 */
export async function withRetryingTransaction(callback, options, { retries = 3 } = {}) {
  for (let attempt = 0; ; attempt++) {
    try {
      return await withTransaction(callback, options);
    } catch (error) {
      if (error?.code !== "P2034" || attempt >= retries) throw error;
      await new Promise((resolve) => setTimeout(resolve, 15 * (attempt + 1) + Math.floor(Math.random() * 25)));
    }
  }
}

/** Lightweight connectivity check used by health checks and diagnostics. */
export async function checkDatabaseConnection() {
  await getDb().$queryRaw`SELECT 1`;
  return true;
}

/** Close the pool if one was opened (CLI scripts, graceful shutdown). */
export async function disconnectDb() {
  await globalForPrisma.__4broPrisma?.$disconnect();
}
