import { NextResponse } from "next/server";
import { checkDatabaseConnection } from "@/lib/db";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

/** Public liveness/readiness probe for uptime monitors. Reveals status only — no versions or errors. */
export async function GET() {
  let database = "up";
  try {
    await checkDatabaseConnection();
  } catch (error) {
    database = "down";
    logger.error("Health check: database unavailable", { error });
  }

  const ok = database === "up";
  return NextResponse.json(
    { status: ok ? "ok" : "degraded", database, time: new Date().toISOString() },
    { status: ok ? 200 : 503, headers: { "Cache-Control": "no-store" } },
  );
}
