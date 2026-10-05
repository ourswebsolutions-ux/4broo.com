// Cart and Save-for-later data access (signed-in customers only).
// Every function takes the authenticated userId from the server session —
// never from client input — and verifies ownership of the rows it touches.
import "server-only";
import { DEFAULT_LOCALE } from "../i18n/config.js";
import { translationsFor } from "../i18n/content.js";
import { getDb, withTransaction } from "../lib/db.js";
import { ConflictError, NotFoundError } from "../lib/errors.js";
import { validate } from "../lib/validation/index.js";
import { cartItemInputSchema, quantityUpdateSchema } from "../lib/validation/schemas/commerce.js";
import { idSchema } from "../lib/validation/schemas/common.js";

/** Highest quantity of one variant per cart line (matches quantitySchema). */
export const MAX_LINE_QUANTITY = 99;

/** Relations needed to display a cart / saved line (product text localised when a locale is given). */
function itemInclude(locale = DEFAULT_LOCALE) {
  const translations = translationsFor(locale);
  return {
    variant: true,
    product: {
      select: {
        id: true,
        name: true,
        slug: true,
        price: true,
        salePrice: true,
        onSale: true,
        status: true,
        images: { orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }], take: 1 },
        ...(translations && { translations }),
      },
    },
  };
}

/** The purchasable variant (published product, stock available) or a clear error. */
async function getPurchasableVariant(db, variantId, quantity) {
  const variant = await db.productVariant.findUnique({
    where: { id: variantId },
    select: { id: true, productId: true, stock: true, product: { select: { status: true } } },
  });
  if (!variant || variant.product.status !== "PUBLISHED") throw new NotFoundError("This item is no longer available.").localized("errors.unavailable");
  if (variant.stock < quantity) {
    throw variant.stock
      ? new ConflictError(`Only ${variant.stock} left in stock.`).localized("errors.onlyLeft", { count: variant.stock })
      : new ConflictError("This item is sold out.").localized("errors.soldOut");
  }
  if (quantity > MAX_LINE_QUANTITY) throw new ConflictError(`You can add up to ${MAX_LINE_QUANTITY} of this item.`).localized("errors.maxQuantity", { count: MAX_LINE_QUANTITY });
  return variant;
}

export async function getCart(userId, { locale } = {}) {
  return getDb().cart.findUnique({
    where: { userId },
    include: { items: { orderBy: { createdAt: "asc" }, include: itemInclude(locale) } },
  });
}

export async function getCartItemCount(userId) {
  const { _sum } = await getDb().cartItem.aggregate({ where: { cart: { userId } }, _sum: { quantity: true } });
  return _sum.quantity ?? 0;
}

/** Add a variant (or increase its quantity). One cart per user, one row per variant. */
export async function addToCart(userId, input) {
  const { variantId, quantity } = validate(cartItemInputSchema, input);

  return withTransaction(async (tx) => {
    const cart = await tx.cart.upsert({ where: { userId }, update: {}, create: { userId } });
    const existing = await tx.cartItem.findUnique({ where: { cartId_variantId: { cartId: cart.id, variantId } } });
    const variant = await getPurchasableVariant(tx, variantId, (existing?.quantity ?? 0) + quantity);

    return tx.cartItem.upsert({
      where: { cartId_variantId: { cartId: cart.id, variantId } },
      update: { quantity: { increment: quantity } },
      create: { cartId: cart.id, productId: variant.productId, variantId, quantity },
    });
  });
}

export async function updateCartItemQuantity(userId, input) {
  const { itemId, quantity } = validate(quantityUpdateSchema, input);
  const db = getDb();
  const item = await db.cartItem.findFirst({ where: { id: itemId, cart: { userId } } });
  if (!item) throw new NotFoundError("Cart item not found.").localized("errors.notFound");
  await getPurchasableVariant(db, item.variantId, quantity);
  return db.cartItem.update({ where: { id: item.id }, data: { quantity } });
}

export async function removeCartItem(userId, itemId) {
  const id = validate(idSchema, itemId);
  const { count } = await getDb().cartItem.deleteMany({ where: { id, cart: { userId } } });
  if (!count) throw new NotFoundError("Cart item not found.").localized("errors.notFound");
}

// ─── Save for later ──────────────────────────────────────────────────────────

export async function listSavedItems(userId, { locale } = {}) {
  return getDb().savedItem.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, include: itemInclude(locale) });
}

/** Move a cart line to "saved for later" atomically (merging quantities if already saved). */
export async function moveCartItemToSaved(userId, itemId) {
  const id = validate(idSchema, itemId);
  return withTransaction(async (tx) => {
    const item = await tx.cartItem.findFirst({ where: { id, cart: { userId } } });
    if (!item) throw new NotFoundError("Cart item not found.").localized("errors.notFound");
    await tx.cartItem.delete({ where: { id: item.id } });
    return tx.savedItem.upsert({
      where: { userId_variantId: { userId, variantId: item.variantId } },
      update: { quantity: { increment: item.quantity } },
      create: { userId, productId: item.productId, variantId: item.variantId, quantity: item.quantity },
    });
  });
}

/** Move a saved item back into the cart atomically (stock re-checked). */
export async function moveSavedItemToCart(userId, savedItemId) {
  const id = validate(idSchema, savedItemId);
  return withTransaction(async (tx) => {
    const saved = await tx.savedItem.findFirst({ where: { id, userId } });
    if (!saved) throw new NotFoundError("Saved item not found.").localized("errors.notFound");

    const cart = await tx.cart.upsert({ where: { userId }, update: {}, create: { userId } });
    const existing = await tx.cartItem.findUnique({ where: { cartId_variantId: { cartId: cart.id, variantId: saved.variantId } } });
    await getPurchasableVariant(tx, saved.variantId, (existing?.quantity ?? 0) + saved.quantity);

    await tx.savedItem.delete({ where: { id: saved.id } });
    return tx.cartItem.upsert({
      where: { cartId_variantId: { cartId: cart.id, variantId: saved.variantId } },
      update: { quantity: { increment: saved.quantity } },
      create: { cartId: cart.id, productId: saved.productId, variantId: saved.variantId, quantity: saved.quantity },
    });
  });
}

export async function removeSavedItem(userId, savedItemId) {
  const id = validate(idSchema, savedItemId);
  const { count } = await getDb().savedItem.deleteMany({ where: { id, userId } });
  if (!count) throw new NotFoundError("Saved item not found.").localized("errors.notFound");
}
