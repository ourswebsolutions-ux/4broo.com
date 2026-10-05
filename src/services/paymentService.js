// Payment state changes for online payments (server-only).
//
// Only ever called with a status obtained FROM THE PROVIDER (status query or a
// signature-verified callback) — never from a browser redirect or query string.
// Idempotent: a payment leaves PENDING exactly once (conditional update), so
// duplicate callbacks, retries and the customer's return visit cannot apply a
// result twice, double-release stock or flip a settled payment.
import "server-only";
import { compareMoney } from "../lib/currency/money.js";
import { getDb, withRetryingTransaction } from "../lib/db.js";
import { NotFoundError } from "../lib/errors.js";
import { logger } from "../lib/logger.js";
import { releaseOrderStock } from "./orderService.js";

const FINAL = new Set(["PAID", "FAILED", "CANCELLED"]);

/**
 * @param {{ orderId: string, status: "PAID"|"FAILED"|"CANCELLED"|"PENDING", amount?: string, currency?: string, reference?: string, data?: object, reason?: string }} result
 * @returns {Promise<{ applied: boolean, status: string }>}
 */
export async function applyPaymentResult(result) {
  if (!FINAL.has(result.status)) return { applied: false, status: "PENDING" };

  return withRetryingTransaction(async (tx) => {
    const payment = await tx.payment.findUnique({ where: { orderId: result.orderId }, include: { order: { select: { id: true, userId: true, orderNumber: true } } } });
    if (!payment) throw new NotFoundError("Payment not found.");
    if (payment.status !== "PENDING") return { applied: false, status: payment.status };

    let status = result.status;
    let reason = result.reason ?? null;
    // A "paid" result must be for exactly this order's amount and currency.
    if (status === "PAID" && (result.amount === undefined || compareMoney(result.amount, payment.amount) !== 0 || (result.currency ?? "PKR") !== payment.currency)) {
      logger.error("Payment amount mismatch — not marking as paid", { orderNumber: payment.order.orderNumber, reference: result.reference });
      status = "FAILED";
      reason = "Amount or currency mismatch reported by the provider";
    }

    const { count } = await tx.payment.updateMany({
      where: { id: payment.id, status: "PENDING" },
      data: {
        status,
        failureReason: status === "PAID" ? null : reason?.slice(0, 500),
        paidAt: status === "PAID" ? new Date() : null,
        ...(result.reference && { providerReference: result.reference }),
        ...(result.data && { providerData: result.data }),
      },
    });
    if (!count) {
      // Lost a race to another callback — report the status that won.
      const current = await tx.payment.findUnique({ where: { id: payment.id }, select: { status: true } });
      return { applied: false, status: current?.status ?? payment.status };
    }

    if (status === "PAID") {
      // The online order is now final: empty the customer's bag.
      if (payment.order.userId) await tx.cartItem.deleteMany({ where: { cart: { userId: payment.order.userId } } });
      await tx.orderStatusEvent.create({ data: { orderId: payment.orderId, status: "NEW", actor: "SYSTEM", note: "Payment received" } });
    } else {
      // Failed / cancelled payment: close the order and return its reserved stock (once).
      await tx.order.updateMany({ where: { id: payment.orderId, status: "NEW" }, data: { status: "CANCELLED" } });
      await tx.orderStatusEvent.create({ data: { orderId: payment.orderId, status: "CANCELLED", actor: "SYSTEM", note: status === "FAILED" ? "Payment failed" : "Payment cancelled" } });
      await releaseOrderStock(tx, payment.orderId);
    }
    return { applied: true, status };
  });
}

/** Look up the order behind a provider reference (callbacks identify payments by reference). */
export async function findOrderIdByReference(method, reference) {
  const payment = await getDb().payment.findFirst({ where: { method, providerReference: reference }, select: { orderId: true } });
  return payment?.orderId ?? null;
}
