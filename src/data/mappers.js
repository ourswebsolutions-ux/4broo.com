// Maps catalogue records (Prisma `Product` with relations) into the plain,
// serialisable shapes the storefront UI consumes. UI components depend ONLY on
// these shapes — never on Prisma models directly.
//
// Money: PKR decimal strings are the source of truth. When a USD rate is
// configured, a converted `usd` figure is attached for display only.
import { BASE_CURRENCY } from "@/config/currency";
import { convertMoney } from "@/lib/currency/money";
import { discountPercent, resolveUnitPrice } from "@/lib/currency/pricing";

export const LOW_STOCK_THRESHOLD = 5;

/**
 * @typedef {object} Price
 * @property {string} amount            PKR, e.g. "9990.00"
 * @property {string|null} compareAt    original PKR price when discounted
 * @property {"PKR"} currency
 * @property {number|null} discountPercent
 * @property {{ amount: string, compareAt: string|null }|null} usd  display conversion (null when no rate)
 *
 * @typedef {object} ProductCardData
 * @property {string} id
 * @property {string} slug
 * @property {string} name
 * @property {string} href
 * @property {{ name: string, slug: string } | null} category
 * @property {string} gender
 * @property {Price} price
 * @property {Array<{ src: string, alt: string, width: number, height: number }>} images  ordered: primary first, then sortOrder
 * @property {{ isNew: boolean, isBestSeller: boolean, isOnSale: boolean, isFeatured: boolean }} badges
 * @property {{ status: "in_stock" | "low_stock" | "out_of_stock", quantity: number }} stock
 * @property {string | null} shortDescription
 */

export function stockState(quantity) {
  if (quantity <= 0) return { status: "out_of_stock", quantity: 0 };
  if (quantity <= LOW_STOCK_THRESHOLD) return { status: "low_stock", quantity };
  return { status: "in_stock", quantity };
}

function priceOf(product, variant, usdRate) {
  const { unitPrice, compareAtPrice } = resolveUnitPrice(product, variant);
  return {
    amount: unitPrice,
    compareAt: compareAtPrice,
    currency: BASE_CURRENCY,
    discountPercent: discountPercent(unitPrice, compareAtPrice),
    usd: usdRate
      ? { amount: convertMoney(unitPrice, usdRate), compareAt: compareAtPrice ? convertMoney(compareAtPrice, usdRate) : null }
      : null,
  };
}

const byDisplayOrder = (a, b) => Number(b.isPrimary) - Number(a.isPrimary) || a.sortOrder - b.sortOrder;

function imagesOf(record) {
  return [...(record.images ?? [])].sort(byDisplayOrder).map((image) => ({
    src: image.url,
    alt: image.alt || record.name,
    width: image.width ?? 1200,
    height: image.height ?? 1500,
  }));
}

/** @returns {ProductCardData} */
export function toProductCard(record, { usdRate = null } = {}) {
  const price = priceOf(record, null, usdRate);
  return {
    id: record.id,
    slug: record.slug,
    name: record.name,
    href: `/products/${record.slug}`,
    category: record.category ? { name: record.category.name, slug: record.category.slug } : null,
    gender: record.gender,
    price,
    // Cards only need the primary + hover image.
    images: imagesOf(record).slice(0, 2),
    badges: {
      isNew: Boolean(record.newArrival),
      isBestSeller: Boolean(record.bestSeller),
      isOnSale: price.compareAt !== null,
      isFeatured: Boolean(record.featured),
    },
    stock: stockState(record.stock ?? 0),
    shortDescription: record.shortDescription ?? null,
  };
}

/** Full product page shape: all images, variants with their own price/stock, details and SEO. */
export function toProductDetail(record, { usdRate = null } = {}) {
  const card = toProductCard(record, { usdRate });
  return {
    ...card,
    images: imagesOf(record),
    description: record.description ?? null,
    material: record.material ?? null,
    sku: record.sku ?? null,
    category: record.category
      ? {
          name: record.category.name,
          slug: record.category.slug,
          parent: record.category.parent ? { name: record.category.parent.name, slug: record.category.parent.slug } : null,
        }
      : null,
    seo: { title: record.seoTitle ?? null, description: record.seoDescription ?? null },
    variants: (record.variants ?? []).map((variant) => ({
      id: variant.id,
      sku: variant.sku,
      size: variant.size,
      color: variant.color,
      colorHex: variant.colorHex,
      price: priceOf(record, variant, usdRate),
      stock: stockState(variant.stock),
    })),
    updatedAt: record.updatedAt ? new Date(record.updatedAt).toISOString() : null,
  };
}
