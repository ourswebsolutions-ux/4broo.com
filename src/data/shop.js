// Customer shopping read model: cart, save-for-later and wishlist, shaped for the UI.
//
// All money is computed here, on the server, from canonical PKR prices in the
// database (BigInt decimal maths). The browser never sends or computes prices:
// it only displays the strings returned here (and the optional USD conversion).
import "server-only";
import { BASE_CURRENCY } from "@/config/currency";
import { localize } from "@/i18n/content";
import { DEFAULT_LOCALE } from "@/i18n/config";
import { addMoney, convertMoney, multiplyMoney, subtractMoney } from "@/lib/currency/money";
import { resolveUnitPrice } from "@/lib/currency/pricing";
import { getCart, listSavedItems } from "@/services/cartService";
import { listWishlist } from "@/services/wishlistService";
import { getDb } from "@/lib/db";
import { getUsdRate } from "./catalog";
import { stockState, toProductCard } from "./mappers";

const TEXT_FIELDS = ["name"];

/** { amount: "PKR", usd: "USD" | null } — the only money shape the shop UI receives. */
const money = (amount, usdRate) => ({ amount, currency: BASE_CURRENCY, usd: usdRate ? convertMoney(amount, usdRate) : null });

/**
 * One cart / saved line. `purchasable` is false when the product was unpublished
 * or the variant is out of stock; `maxQuantity` is the stock available now.
 */
function toLine(record, usdRate, locale) {
  const product = localize(record.product, locale, TEXT_FIELDS);
  const variant = record.variant;
  const { unitPrice, compareAtPrice } = resolveUnitPrice(product, variant);
  const published = product.status === "PUBLISHED";
  const image = product.images?.[0];

  return {
    id: record.id,
    productId: product.id,
    variantId: variant.id,
    name: product.name,
    href: `/products/${product.slug}`,
    image: image ? { src: image.url, alt: image.alt || product.name } : null,
    size: variant.size,
    color: variant.color,
    sku: variant.sku,
    quantity: record.quantity,
    unitPrice: { ...money(unitPrice, usdRate), compareAt: compareAtPrice ? money(compareAtPrice, usdRate) : null },
    lineTotal: money(multiplyMoney(unitPrice, record.quantity), usdRate),
    savings: compareAtPrice ? subtractMoney(multiplyMoney(compareAtPrice, record.quantity), multiplyMoney(unitPrice, record.quantity)) : "0.00",
    stock: published ? stockState(variant.stock) : stockState(0),
    maxQuantity: published ? variant.stock : 0,
    purchasable: published && variant.stock > 0,
  };
}

/** Totals over lines that can actually be bought (unavailable lines are excluded and flagged). */
function totalsOf(lines, usdRate) {
  const counted = lines.filter((line) => line.purchasable);
  const subtotal = addMoney("0", ...counted.map((line) => line.lineTotal.amount));
  const savings = addMoney("0", ...counted.map((line) => line.savings));
  return {
    count: lines.reduce((sum, line) => sum + line.quantity, 0),
    subtotal: money(subtotal, usdRate),
    savings: savings === "0.00" ? null : money(savings, usdRate),
    hasIssues: lines.some((line) => !line.purchasable || line.quantity > line.maxQuantity),
  };
}

/**
 * Everything the header, cart drawer, cart page and heart buttons need for one
 * signed-in customer, in one round of queries.
 */
export async function getShopState(user, { locale = DEFAULT_LOCALE } = {}) {
  if (!user) return { user: null, cart: emptyCart(), saved: [], wishlist: [] };

  const [usdRate, cart, saved, wishlist] = await Promise.all([
    getUsdRate(),
    getCart(user.id, { locale }),
    listSavedItems(user.id, { locale }),
    getDb().wishlistItem.findMany({ where: { userId: user.id }, select: { productId: true } }),
  ]);

  const lines = (cart?.items ?? []).map((item) => toLine(item, usdRate, locale));
  return {
    user: { firstName: user.firstName, role: user.role },
    cart: { items: lines, ...totalsOf(lines, usdRate) },
    saved: saved.map((item) => toLine(item, usdRate, locale)),
    wishlist: wishlist.map((row) => row.productId),
  };
}

function emptyCart() {
  return { items: [], count: 0, subtotal: money("0.00", null), savings: null, hasIssues: false };
}

/**
 * Wishlist page: product cards (current price + availability) plus the single
 * purchasable variant when there is exactly one, so "Add to bag" can work
 * directly; otherwise the customer is sent to choose a size/colour.
 */
export async function getWishlistView(userId, { locale = DEFAULT_LOCALE } = {}) {
  const [usdRate, rows] = await Promise.all([getUsdRate(), listWishlist(userId, { locale })]);
  return rows.map((row) => {
    const product = localize(row.product, locale, ["name", "shortDescription"]);
    const inStock = product.variants.filter((variant) => variant.stock > 0);
    return {
      ...toProductCard(product, { usdRate }),
      addedAt: row.createdAt.toISOString(),
      quickAddVariantId: product.variants.length === 1 && inStock.length === 1 ? inStock[0].id : null,
    };
  });
}
