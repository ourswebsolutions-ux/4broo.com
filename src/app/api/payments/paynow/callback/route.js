import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { getPaymentProvider } from "@/lib/payments";
import { settleFromProvider } from "@/lib/payments/settle";
import { findOrderIdByReference } from "@/services/paymentService";

/**
 * Server-to-server PayNow notification. The callback must pass the provider's
 * signature verification; even then its claimed status is not used directly —
 * the status is re-fetched from the provider and applied idempotently.
 */
export async function POST(request) {
  const provider = getPaymentProvider("PAYNOW");
  if (!provider.isConfigured()) return NextResponse.json({ ok: false, error: "PayNow is not configured" }, { status: 503 });

  const rawBody = await request.text();
  if (rawBody.length > 64 * 1024) return NextResponse.json({ ok: false }, { status: 413 });
  try {
    const { reference } = await provider.verifyCallback({ headers: request.headers, rawBody });
    const orderId = await findOrderIdByReference("PAYNOW", reference);
    if (!orderId) return NextResponse.json({ ok: false }, { status: 404 });
    const status = await settleFromProvider(orderId);
    return NextResponse.json({ ok: true, status });
  } catch (error) {
    logger.warn("Rejected PayNow callback", { message: error.message });
    return NextResponse.json({ ok: false }, { status: 400 });
  }
}
