// Orders: numbering, server-side totals, snapshots, transactional placement,
// stock reservation/release, status workflow, customer reads, tracking and admin.
//
// Invariants:
//  • Prices, totals and delivery fees are computed here from the database — never
//    taken from the browser.
//  • An order, its items, its payment row, its first status event and the stock
//    decrement are written in ONE transaction; any failure rolls everything back.
//  • A checkout attempt carries an idempotency key; repeating it returns the same order.
//  • Reserved stock is returned at most once (Order.stockReleasedAt guard).
//  • Notifications (email/WhatsApp) are a later phase: they will subscribe to
//    `afterOrderPlaced` below and run after commit, never inside the transaction.
import "server-only";
import { randomInt } from "node:crypto";
import { addMoney, compareMoney, multiplyMoney, subtractMoney } from "../lib/currency/money.js";
import { resolveUnitPrice } from "../lib/currency/pricing.js";
import { getDb, withRetryingTransaction } from "../lib/db.js";
import { AppError, ConflictError, NotFoundError, ValidationError } from "../lib/errors.js";
import { logger } from "../lib/logger.js";
import { quoteDelivery } from "../lib/shipping.js";
import { validate } from "../lib/validation/index.js";
import { orderAmountsSchema } from "../lib/validation/schemas/commerce.js";
import { decrementVariantStock } from "./productService.js";

const ORDER_NUMBER_ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ"; // no 0/O/1/I confusion
const MAX_NUMBER_ATTEMPTS = 4;

/**
 * Customer-friendly, non-sequential order number: 4BRO-YYYYMMDD-XXXXXX.
 * Six random characters from a 32-symbol alphabet (~1 billion per day); the column
 * is unique-indexed and placement retries on the rare collision.
 */
export function generateOrderNumber(date = new Date()) {
  const stamp = date.toISOString().slice(0, 10).replace(/-/g, "");
  const suffix = Array.from({ length: 6 }, () => ORDER_NUMBER_ALPHABET[randomInt(ORDER_NUMBER_ALPHABET.length)]).join("");
  return `4BRO-${stamp}-${suffix}`;
}

/**
 * Exact PKR totals from order lines.
 * @param {Array<{ unitPrice: string, quantity: number }>} lines
 * @param {{ discount?: string, deliveryFee?: string }} amounts
 */
export function calculateOrderTotals(lines, amounts = {}) {
  if (!lines.length) throw new ValidationError("An order needs at least one item.");
  const { discount, deliveryFee } = validate(orderAmountsSchema, amounts);

  const lineTotals = lines.map((line) => {
    if (!Number.isInteger(line.quantity) || line.quantity < 1) throw new ValidationError("Invalid item quantity.");
    return multiplyMoney(line.unitPrice, line.quantity);
  });
  const subtotal = addMoney(...lineTotals);
  if (compareMoney(discount, subtotal) > 0) throw new ValidationError("Discount cannot exceed the subtotal.");
  const total = addMoney(subtractMoney(subtotal, discount), deliveryFee);

  return { lineTotals, subtotal, discount, deliveryFee, total, currency: "PKR" };
}

/** Freeze product/variant data onto an order line so history never changes. */
export function toOrderItemSnapshot(variant, quantity) {
  const { unitPrice } = resolveUnitPrice(variant.product, variant);
  const image = variant.product.images?.[0];
  return {
    productId: variant.product.id,
    variantId: variant.id,
    productName: variant.product.name,
    sku: variant.sku,
    size: variant.size,
    color: variant.color,
    imageUrl: image?.url ?? null,
    quantity,
    unitPrice,
    lineTotal: multiplyMoney(unitPrice, quantity),
  };
}

// ─── Placement ───────────────────────────────────────────────────────────────

const CART_FOR_CHECKOUT = {
  items: {
    orderBy: { createdAt: "asc" },
    include: {
      variant: {
        include: {
          product: {
            select: {
              id: true,
              name: true,
              status: true,
              price: true,
              salePrice: true,
              onSale: true,
              images: { orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }], take: 1, select: { url: true } },
            },
          },
        },
      },
    },
  },
};

const stockChanged = () =>
  new ConflictError("Some items in your bag are no longer available in the requested quantity.").localized("errors.stockChanged");

/**
 * Validate the customer's cart against live data and build order lines.
 * Throws when the bag is empty, an item was unpublished or stock is short.
 */
async function buildLines(db, userId) {
  const cart = await db.cart.findUnique({ where: { userId }, include: CART_FOR_CHECKOUT });
  const items = cart?.items ?? [];
  if (!items.length) throw new ValidationError("Your bag is empty.").localized("errors.cartEmpty");
  for (const item of items) {
    if (item.variant.product.status !== "PUBLISHED" || item.variant.stock < item.quantity) throw stockChanged();
  }
  return items.map((item) => toOrderItemSnapshot(item.variant, item.quantity));
}

/**
 * Read-only checkout preview (same rules as placement): lines, delivery quote and totals.
 * Used by the checkout page; placement recomputes everything inside its transaction.
 */
export async function previewCheckout(userId, { country = "Pakistan" } = {}) {
  const lines = await buildLines(getDb(), userId);
  const subtotal = calculateOrderTotals(lines).subtotal;
  const delivery = quoteDelivery({ country, subtotal });
  return { lines, delivery, totals: calculateOrderTotals(lines, { deliveryFee: delivery.fee }) };
}

/**
 * Place an order from the signed-in customer's bag.
 *
 * @param {{ id: string }} user                    from the server session
 * @param {object} input                            validated checkoutSchema output + resolved address
 * @param {{ exchangeRate?: string|null }} options  PKR→display rate snapshot (display only)
 * @returns {Promise<{ order: object, created: boolean }>}
 */
export async function placeOrder(user, input, { exchangeRate = null } = {}) {
  const db = getDb();

  // Idempotency: the same checkout attempt returns the order it already created.
  const existing = await db.order.findUnique({ where: { idempotencyKey: input.idempotencyKey }, include: { payment: true } });
  if (existing) {
    if (existing.userId !== user.id) throw new ConflictError("This checkout session is no longer valid.");
    return { order: existing, created: false };
  }

  for (let attempt = 1; ; attempt++) {
    try {
      const order = await withRetryingTransaction(async (tx) => {
        const lines = await buildLines(tx, user.id);
        const { subtotal } = calculateOrderTotals(lines);
        const delivery = quoteDelivery({ country: input.country, subtotal });
        const totals = calculateOrderTotals(lines, { deliveryFee: delivery.fee });

        const created = await tx.order.create({
          data: {
            orderNumber: generateOrderNumber(),
            idempotencyKey: input.idempotencyKey,
            userId: user.id,
            locale: input.locale ?? "en",
            currency: "PKR",
            displayCurrency: input.displayCurrency === "USD" && exchangeRate ? "USD" : "PKR",
            exchangeRate: input.displayCurrency === "USD" ? exchangeRate : null,
            customerName: input.fullName,
            customerEmail: input.email,
            customerPhone: input.phone,
            whatsappNumber: input.whatsappNumber,
            address: input.addressLine,
            city: input.city,
            postalCode: input.postalCode,
            country: input.country,
            deliveryMethod: delivery.method,
            deliveryFeeConfirmed: delivery.confirmed,
            subtotal: totals.subtotal,
            discount: totals.discount,
            deliveryFee: totals.deliveryFee,
            total: totals.total,
            customerNote: input.customerNote,
            items: { create: lines },
            payment: { create: { method: input.paymentMethod, amount: totals.total, currency: "PKR" } },
            statusEvents: { create: { status: "NEW", actor: "CUSTOMER" } },
          },
          include: { payment: true },
        });

        // Reserve stock: conditional decrements — concurrent checkouts cannot oversell.
        for (const line of lines) {
          try {
            await decrementVariantStock(tx, line.variantId, line.quantity);
          } catch (error) {
            if (error instanceof ConflictError || error instanceof NotFoundError) throw stockChanged();
            throw error;
          }
        }

        // COD orders are final now; online payments keep the bag until payment succeeds.
        if (input.paymentMethod === "COD") await tx.cartItem.deleteMany({ where: { cart: { userId: user.id } } });
        return created;
      });

      afterOrderPlaced(order);
      return { order, created: true };
    } catch (error) {
      if (error?.code === "P2002") {
        const target = String(error.meta?.target ?? error.message ?? "");
        if (/idempotency/i.test(target)) {
          // A parallel submission with the same key won the race — return its order.
          const winner = await db.order.findUnique({ where: { idempotencyKey: input.idempotencyKey }, include: { payment: true } });
          if (winner?.userId === user.id) return { order: winner, created: false };
        }
        if (/orderNumber/i.test(target) && attempt < MAX_NUMBER_ATTEMPTS) continue;
      }
      throw error;
    }
  }
}

/** Notification hook (Phase 8: email / WhatsApp). Runs after commit; must never throw into checkout. */
function afterOrderPlaced(order) {
  logger.info("Order placed", { orderNumber: order.orderNumber, paymentMethod: order.payment?.method });
}

// ─── Stock release ───────────────────────────────────────────────────────────

/**
 * Return an order's reserved stock exactly once (cancellation, failed/cancelled payment).
 * Must run inside a transaction. Variants deleted since the order are skipped.
 */
export async function releaseOrderStock(tx, orderId) {
  const { count } = await tx.order.updateMany({ where: { id: orderId, stockReleasedAt: null }, data: { stockReleasedAt: new Date() } });
  if (!count) return false;
  const items = await tx.orderItem.findMany({ where: { orderId, variantId: { not: null } }, select: { variantId: true, quantity: true } });
  for (const item of items) {
    const variant = await tx.productVariant.findUnique({ where: { id: item.variantId }, select: { productId: true } });
    if (!variant) continue;
    await tx.productVariant.update({ where: { id: item.variantId }, data: { stock: { increment: item.quantity } } });
    await tx.product.update({ where: { id: variant.productId }, data: { stock: { increment: item.quantity } } });
  }
  return true;
}

// ─── Customer reads ──────────────────────────────────────────────────────────

const ORDER_DETAIL_INCLUDE = {
  items: { orderBy: { createdAt: "asc" } },
  payment: true,
  statusEvents: { orderBy: { createdAt: "asc" } },
};

/** A customer's own order by number (ownership enforced by userId — ids are never accepted). */
export async function getOrderForUser(userId, orderNumber) {
  const order = await getDb().order.findFirst({ where: { orderNumber: String(orderNumber).toUpperCase(), userId }, include: ORDER_DETAIL_INCLUDE });
  if (!order) throw new NotFoundError("Order not found.").localized("errors.orderNotFound");
  return order;
}

export async function listOrdersForUser(userId, { take = 20, skip = 0 } = {}) {
  return getDb().order.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take,
    skip,
    include: { items: { select: { productName: true, quantity: true, imageUrl: true }, take: 4 }, payment: { select: { status: true, method: true } } },
  });
}

/**
 * Public tracking lookup: order number + the email on the order must both match.
 * Returns null on any mismatch (no hint whether the number exists).
 */
export async function findOrderForTracking(orderNumber, email) {
  const order = await getDb().order.findUnique({ where: { orderNumber }, include: ORDER_DETAIL_INCLUDE });
  if (!order || order.customerEmail.toLowerCase() !== email.toLowerCase()) return null;
  return order;
}

// ─── Status workflow (admin) ─────────────────────────────────────────────────

export const ORDER_STATUSES = ["NEW", "CONFIRMED", "PROCESSING", "PACKED", "SHIPPED", "DELIVERED", "CANCELLED"];

export const ORDER_TRANSITIONS = {
  NEW: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["PROCESSING", "CANCELLED"],
  PROCESSING: ["PACKED", "CANCELLED"],
  PACKED: ["SHIPPED", "CANCELLED"],
  SHIPPED: ["DELIVERED"],
  DELIVERED: [],
  CANCELLED: [],
};

export function assertStatusTransition(from, to) {
  if (!ORDER_TRANSITIONS[from]?.includes(to)) {
    throw new AppError(`An order cannot move from ${from} to ${to}.`, { status: 409, code: "INVALID_TRANSITION" });
  }
}

/**
 * Move an order to the next status (admin). Concurrency-safe: the update only
 * applies if the order is still in the status the admin saw. Cancelling returns
 * reserved stock once; an unpaid payment is closed as CANCELLED.
 */
export async function updateOrderStatus(orderId, { from, to, note }) {
  assertStatusTransition(from, to);
  return withRetryingTransaction(async (tx) => {
    const { count } = await tx.order.updateMany({ where: { id: orderId, status: from }, data: { status: to } });
    if (!count) throw new ConflictError("This order was updated by someone else. Refresh and try again.");
    await tx.orderStatusEvent.create({ data: { orderId, status: to, actor: "ADMIN", note: note || null } });
    if (to === "CANCELLED") {
      await releaseOrderStock(tx, orderId);
      await tx.payment.updateMany({ where: { orderId, status: "PENDING" }, data: { status: "CANCELLED" } });
    }
    return tx.order.findUnique({ where: { id: orderId }, select: { id: true, status: true } });
  });
}

/** COD: record that the courier collected the cash. Only for open, pending COD payments. */
export async function markCodPaymentReceived(orderId) {
  return withRetryingTransaction(async (tx) => {
    const order = await tx.order.findUnique({ where: { id: orderId }, select: { status: true } });
    if (!order) throw new NotFoundError("Order not found.");
    if (order.status === "CANCELLED") throw new ConflictError("A cancelled order cannot be marked as paid.");
    const { count } = await tx.payment.updateMany({ where: { orderId, method: "COD", status: "PENDING" }, data: { status: "PAID", paidAt: new Date() } });
    if (!count) throw new ConflictError("This payment is not a pending cash-on-delivery payment.");
  });
}

export async function updateAdminNote(orderId, note) {
  const text = typeof note === "string" ? note.trim().slice(0, 5000) : "";
  const { count } = await getDb().order.updateMany({ where: { id: orderId }, data: { adminNote: text || null } });
  if (!count) throw new NotFoundError("Order not found.");
}

// ─── Admin reads ─────────────────────────────────────────────────────────────

/** Admin list: search by order number / customer name / email / phone, filter by status. */
export async function listAdminOrders({ q, status, page = 1, pageSize = 25 } = {}) {
  const db = getDb();
  const term = q?.trim();
  const where = {
    ...(status && ORDER_STATUSES.includes(status) && { status }),
    ...(term && {
      OR: [
        { orderNumber: { contains: term.toUpperCase() } },
        { customerName: { contains: term } },
        { customerEmail: { contains: term.toLowerCase() } },
        { customerPhone: { contains: term.replace(/[\s()+-]/g, "") } },
      ],
    }),
  };
  const [total, counts] = await Promise.all([db.order.count({ where }), db.order.groupBy({ by: ["status"], _count: { _all: true } })]);
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(Math.max(1, page), pageCount);
  const items = await db.order.findMany({
    where,
    orderBy: { createdAt: "desc" },
    skip: (safePage - 1) * pageSize,
    take: pageSize,
    include: { payment: { select: { method: true, status: true } }, _count: { select: { items: true } } },
  });
  return { items, total, page: safePage, pageCount, statusCounts: Object.fromEntries(counts.map((row) => [row.status, row._count._all])) };
}

export async function getAdminOrder(orderId) {
  const order = await getDb().order.findUnique({
    where: { id: orderId },
    include: { ...ORDER_DETAIL_INCLUDE, user: { select: { id: true, email: true, firstName: true, lastName: true, createdAt: true } } },
  });
  if (!order) throw new NotFoundError("Order not found.");
  return order;
}
