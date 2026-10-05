// Order notifications (server-only).
//
// Customer rule — WhatsApp first, email only as fallback:
//   WhatsApp SENT   → stop (no email)
//   WhatsApp FAILED → email; the email row records fallbackFrom = WHATSAPP
//   both FAILED     → notification FAILED; the order is unaffected; admin can retry
// Admin alerts use both channels independently.
//
// Admin preferences (/admin/settings) can turn an event type off, turn a channel
// off, or turn off the email fallback. A channel that is turned off is recorded as
// SKIPPED (so the audit shows why) and the flow continues exactly as if it had
// failed — WhatsApp off ⇒ the customer gets the email fallback.
//
// Idempotency: each logical event has an eventKey; the unique (eventKey, channel)
// row is claimed BEFORE sending, so a repeated or concurrent trigger cannot send a
// second message. Rows are the audit trail shown in the admin.
//
// Runs after the order transaction has committed (callers use next/server `after`),
// never inside it — a delivery problem can never roll back or block an order.
import "server-only";
import { getDb } from "../lib/db.js";
import { logger } from "../lib/logger.js";
import { buildAdminNewOrderMessage, buildCustomerMessage } from "../lib/notifications/templates.js";
import { getNotificationPreferences, getPublicContact } from "../lib/settings/index.js";
import { sendEmail } from "../lib/services/email.js";
import { maskNumber, normalizeWhatsAppNumber, sendWhatsAppText } from "../lib/services/whatsapp.js";

const STALE_PENDING_MS = 5 * 60 * 1000;
const ORDER_FOR_NOTIFY = { items: { orderBy: { createdAt: "asc" } }, payment: true, statusEvents: { orderBy: { createdAt: "asc" } } };

/** Short, secret-free description of a delivery failure for the audit row. */
function describe(error) {
  return String(error?.internalMessage ?? error?.message ?? "Unknown error").slice(0, 500);
}

/**
 * Claim the right to send on one channel. Returns the row to use, or null when this
 * event/channel was already sent or is being sent. With `retry`, a FAILED (or stale
 * PENDING) row is re-claimed atomically.
 */
async function claim({ eventKey, channel, type, audience, orderId, recipient, fallbackFrom = null }, { retry = false } = {}) {
  const db = getDb();
  try {
    return await db.notification.create({ data: { eventKey, channel, type, audience, orderId, recipient, fallbackFrom, attempts: 1 } });
  } catch (error) {
    if (error?.code !== "P2002") throw error;
  }
  if (!retry) return null;
  const staleBefore = new Date(Date.now() - STALE_PENDING_MS);
  const { count } = await db.notification.updateMany({
    where: { eventKey, channel, OR: [{ status: "FAILED" }, { status: "SKIPPED" }, { status: "PENDING", updatedAt: { lt: staleBefore } }] },
    data: { status: "PENDING", attempts: { increment: 1 }, errorMessage: null, recipient, fallbackFrom },
  });
  return count ? db.notification.findUnique({ where: { eventKey_channel: { eventKey, channel } } }) : null;
}

const finish = (id, data) => getDb().notification.update({ where: { id }, data });

const CUSTOMER_EVENT_PREFERENCE = { ORDER_CONFIRMATION: "orderConfirmation", ORDER_STATUS: "statusUpdates", PAYMENT_CONFIRMED: "payment" };

/** WhatsApp → (on failure) email, for one customer event. */
async function deliverToCustomer(order, event, { retry = false } = {}) {
  const db = getDb();
  const eventKey = `${event.type}:${order.id}${event.status ? `:${event.status}` : ""}:CUSTOMER`;
  const prefs = await getNotificationPreferences();
  if (!prefs.customer[CUSTOMER_EVENT_PREFERENCE[event.type]]) return { eventKey, outcome: "DISABLED" };

  // Never send a second confirmation once any channel succeeded for this event.
  if (await db.notification.findFirst({ where: { eventKey, status: "SENT" }, select: { id: true } })) return { eventKey, outcome: "ALREADY_SENT" };

  const message = await buildCustomerMessage(order, event);
  const base = { eventKey, type: event.type, audience: "CUSTOMER", orderId: order.id };

  // 1. WhatsApp (primary)
  let phone = null;
  try {
    phone = normalizeWhatsAppNumber(order.whatsappNumber || order.customerPhone);
  } catch {
    /* invalid number → recorded as a failed WhatsApp attempt below */
  }
  const waRow = await claim({ ...base, channel: "WHATSAPP", recipient: phone ?? String(order.whatsappNumber || order.customerPhone || "").slice(0, 191) }, { retry });
  if (!waRow) return { eventKey, outcome: "IN_PROGRESS_OR_DONE" };

  if (!prefs.whatsappEnabled) {
    await finish(waRow.id, { status: "SKIPPED", errorMessage: "WhatsApp notifications are turned off in admin settings" });
  } else {
    try {
      if (!phone) throw new Error("Invalid WhatsApp number");
      const { messageId } = await sendWhatsAppText({ to: phone, text: message.whatsapp });
      await finish(waRow.id, { status: "SENT", providerReference: messageId, errorMessage: null });
      return { eventKey, outcome: "WHATSAPP_SENT" };
    } catch (error) {
      await finish(waRow.id, { status: "FAILED", errorMessage: describe(error) });
      logger.warn("Customer WhatsApp failed — falling back to email", { eventKey, to: phone ? maskNumber(phone) : "invalid" });
    }
  }

  // 2. Email (fallback only)
  if (!prefs.customer.emailFallback) {
    logger.warn("Customer WhatsApp not delivered and email fallback is turned off", { eventKey });
    return { eventKey, outcome: "FAILED" };
  }
  const emailRow = await claim({ ...base, channel: "EMAIL", recipient: order.customerEmail, fallbackFrom: "WHATSAPP" }, { retry });
  if (!emailRow) return { eventKey, outcome: "IN_PROGRESS_OR_DONE" };
  if (!prefs.emailEnabled) {
    await finish(emailRow.id, { status: "SKIPPED", errorMessage: "Email notifications are turned off in admin settings" });
    logger.error("Customer notification not delivered: WhatsApp unavailable and email turned off", { eventKey });
    return { eventKey, outcome: "FAILED" };
  }
  try {
    const { email: supportEmail } = await getPublicContact();
    const { messageId } = await sendEmail({ to: order.customerEmail, ...message.email, ...(supportEmail && { replyTo: supportEmail }) });
    await finish(emailRow.id, { status: "SENT", providerReference: messageId?.slice(0, 191) ?? null, errorMessage: null });
    return { eventKey, outcome: "EMAIL_SENT" };
  } catch (error) {
    await finish(emailRow.id, { status: "FAILED", errorMessage: describe(error) });
    logger.error("Customer notification failed on WhatsApp and email", { eventKey });
    return { eventKey, outcome: "FAILED" };
  }
}

/** Admin alert on both channels, independently. */
async function deliverToAdmin(order, { retry = false } = {}) {
  const eventKey = `ADMIN_NEW_ORDER:${order.id}:ADMIN`;
  const message = buildAdminNewOrderMessage(order);
  const base = { eventKey, type: "ADMIN_NEW_ORDER", audience: "ADMIN", orderId: order.id };
  const outcomes = {};
  const prefs = await getNotificationPreferences();

  const adminNumber = prefs.admin.number;
  const waRow = await claim({ ...base, channel: "WHATSAPP", recipient: adminNumber }, { retry });
  if (waRow) {
    const skip = !prefs.admin.newOrderWhatsApp
      ? "Admin WhatsApp alerts are turned off in admin settings"
      : !prefs.whatsappEnabled
        ? "WhatsApp notifications are turned off in admin settings"
        : !adminNumber
          ? "No admin WhatsApp number is configured"
          : null;
    if (skip) {
      await finish(waRow.id, { status: "SKIPPED", errorMessage: skip });
      outcomes.whatsapp = "SKIPPED";
    } else {
      try {
        const { messageId } = await sendWhatsAppText({ to: adminNumber, text: message.whatsapp });
        await finish(waRow.id, { status: "SENT", providerReference: messageId });
        outcomes.whatsapp = "SENT";
      } catch (error) {
        await finish(waRow.id, { status: "FAILED", errorMessage: describe(error) });
        outcomes.whatsapp = "FAILED";
      }
    }
  }

  const adminEmail = prefs.admin.email;
  const emailRow = await claim({ ...base, channel: "EMAIL", recipient: adminEmail ?? null }, { retry });
  if (emailRow) {
    const skip = !prefs.admin.newOrderEmail
      ? "Admin email alerts are turned off in admin settings"
      : !prefs.emailEnabled
        ? "Email notifications are turned off in admin settings"
        : !adminEmail
          ? "No admin notification email is configured"
          : null;
    if (skip) {
      await finish(emailRow.id, { status: "SKIPPED", errorMessage: skip });
      outcomes.email = "SKIPPED";
    } else {
      try {
        const { messageId } = await sendEmail({ to: adminEmail, ...message.email });
        await finish(emailRow.id, { status: "SENT", providerReference: messageId?.slice(0, 191) ?? null });
        outcomes.email = "SENT";
      } catch (error) {
        await finish(emailRow.id, { status: "FAILED", errorMessage: describe(error) });
        outcomes.email = "FAILED";
      }
    }
  }
  return { eventKey, outcomes };
}

const loadOrder = (orderId) => getDb().order.findUnique({ where: { id: orderId }, include: ORDER_FOR_NOTIFY });

/** Never throws: notification problems are logged and recorded, never surfaced to checkout. */
async function safely(name, task) {
  try {
    return await task();
  } catch (error) {
    logger.error(`Notification task failed: ${name}`, { error });
    return null;
  }
}

/** New COD order: customer confirmation (WhatsApp → email) + admin alert. */
export function notifyOrderPlaced(orderId) {
  return safely("order placed", async () => {
    const order = await loadOrder(orderId);
    if (!order) return null;
    const [customer, admin] = await Promise.all([deliverToCustomer(order, { type: "ORDER_CONFIRMATION" }), deliverToAdmin(order)]);
    return { customer, admin };
  });
}

/** Verified online payment: customer payment confirmation + admin alert for the now-final order. */
export function notifyPaymentConfirmed(orderId) {
  return safely("payment confirmed", async () => {
    const order = await loadOrder(orderId);
    if (!order || order.payment?.status !== "PAID") return null; // only ever for a verified payment
    const [customer, admin] = await Promise.all([deliverToCustomer(order, { type: "PAYMENT_CONFIRMED" }), deliverToAdmin(order)]);
    return { customer, admin };
  });
}

const STATUS_EVENTS = new Set(["CONFIRMED", "PROCESSING", "PACKED", "SHIPPED", "DELIVERED", "CANCELLED"]);

/** Admin moved the order: tell the customer (WhatsApp → email). */
export function notifyStatusChanged(orderId, status) {
  if (!STATUS_EVENTS.has(status)) return Promise.resolve(null);
  return safely("status changed", async () => {
    const order = await loadOrder(orderId);
    if (!order || order.status !== status) return null; // moved on again before we ran
    return deliverToCustomer(order, { type: "ORDER_STATUS", status });
  });
}

/**
 * Admin retry of a failed notification event. Customer events re-run the WhatsApp →
 * email flow but never resend once any channel has succeeded.
 */
export async function retryNotification(eventKey) {
  const [type, orderId, ...rest] = String(eventKey).split(":");
  const audience = rest.at(-1);
  const status = rest.length > 1 ? rest[0] : undefined;
  const order = await loadOrder(orderId);
  if (!order) return { outcome: "ORDER_NOT_FOUND" };
  if (audience === "ADMIN") return deliverToAdmin(order, { retry: true });
  return deliverToCustomer(order, { type, status }, { retry: true });
}

export async function listOrderNotifications(orderId) {
  return getDb().notification.findMany({ where: { orderId }, orderBy: [{ createdAt: "asc" }, { channel: "desc" }] });
}
