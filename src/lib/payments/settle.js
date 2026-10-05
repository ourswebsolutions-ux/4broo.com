// Settle an online payment from the PROVIDER's authoritative status (server-only).
import "server-only";
import { after } from "next/server";
import { getDb } from "../db.js";
import { logger } from "../logger.js";
import { notifyPaymentConfirmed } from "../../services/notificationService.js";
import { applyPaymentResult } from "../../services/paymentService.js";
import { getPaymentProvider } from "./index.js";

/** Query the provider for an order's payment and apply the result (idempotent). */
export async function settleFromProvider(orderId) {
  const payment = await getDb().payment.findUnique({ where: { orderId }, select: { method: true, status: true, providerReference: true } });
  if (!payment || payment.status !== "PENDING" || !payment.providerReference) return payment?.status ?? null;
  const provider = getPaymentProvider(payment.method);
  if (!provider?.isConfigured()) return payment.status;
  try {
    const status = await provider.fetchStatus(payment.providerReference);
    const outcome = await applyPaymentResult({ orderId, ...status });
    // Only a provider-verified PAID result notifies (WhatsApp → email), and only once.
    if (outcome.applied && outcome.status === "PAID") after(() => notifyPaymentConfirmed(orderId));
    return outcome.status;
  } catch (error) {
    logger.error("Payment status check failed", { orderId, error });
    return payment.status;
  }
}
