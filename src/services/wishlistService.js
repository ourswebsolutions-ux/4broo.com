// Wishlist (favourites) data access — product level, one row per user+product.
import "server-only";
import { getDb } from "../lib/db.js";
import { DEFAULT_LOCALE } from "../i18n/config.js";
import { translationsFor } from "../i18n/content.js";
import { NotFoundError, ValidationError } from "../lib/errors.js";
import { validate } from "../lib/validation/index.js";
import { wishlistInputSchema } from "../lib/validation/schemas/commerce.js";

export async function listWishlist(userId, { locale } = {}) {
  const translations = translationsFor(locale ?? DEFAULT_LOCALE);
  return getDb().wishlistItem.findMany({
    where: { userId, product: { status: "PUBLISHED" } },
    orderBy: { createdAt: "desc" },
    include: {
      product: {
        include: {
          category: { select: { name: true, slug: true } },
          images: { orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }], take: 2 },
          variants: { select: { id: true, stock: true } },
          ...(translations && { translations }),
        },
      },
    },
  });
}

/**
 * Add a wishlisted product to the cart when it has exactly one variant (no size/colour
 * choice to make). Returns the variant id, or throws when a choice is required.
 */
export async function getQuickAddVariantId(productId) {
  const id = validate(wishlistInputSchema, { productId }).productId;
  const variants = await getDb().productVariant.findMany({ where: { productId: id, product: { status: "PUBLISHED" } }, select: { id: true }, take: 2 });
  if (!variants.length) throw new NotFoundError("This product is no longer available.").localized("errors.unavailable");
  if (variants.length > 1) throw new ValidationError("Please select a size and colour first.").localized("errors.selectVariant");
  return variants[0].id;
}

/** Idempotent: adding twice keeps a single row (composite unique userId+productId). */
export async function addToWishlist(userId, input) {
  const { productId } = validate(wishlistInputSchema, input);
  const db = getDb();
  const product = await db.product.findFirst({ where: { id: productId, status: "PUBLISHED" }, select: { id: true } });
  if (!product) throw new NotFoundError("This product is no longer available.").localized("errors.unavailable");

  return db.wishlistItem.upsert({
    where: { userId_productId: { userId, productId } },
    update: {},
    create: { userId, productId },
  });
}

export async function removeFromWishlist(userId, input) {
  const { productId } = validate(wishlistInputSchema, input);
  await getDb().wishlistItem.deleteMany({ where: { userId, productId } });
}

/** Which of the given products are in the user's wishlist (for heart icons on a grid). */
export async function getWishlistedProductIds(userId, productIds) {
  if (!userId || !productIds.length) return new Set();
  const rows = await getDb().wishlistItem.findMany({
    where: { userId, productId: { in: productIds } },
    select: { productId: true },
  });
  return new Set(rows.map((row) => row.productId));
}
