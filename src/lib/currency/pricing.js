// The single rule for "what does this cost?" (PKR, decimal strings). Isomorphic.
import { compareMoney, fromMinor, toMinor } from "./money.js";

const str = (value) => (value === null || value === undefined ? null : fromMinor(toMinor(String(value))));

/**
 * Effective unit price for a product (and optional variant):
 *   variant.priceOverride → product.salePrice (when onSale and lower) → product.price
 * @returns {{ unitPrice: string, compareAtPrice: string | null }}
 */
export function resolveUnitPrice(product, variant = null) {
  const regular = str(variant?.priceOverride) ?? str(product.price);
  const sale = str(product.salePrice);
  const saleApplies = Boolean(product.onSale) && sale !== null && !variant?.priceOverride && compareMoney(sale, regular) < 0;

  return saleApplies ? { unitPrice: sale, compareAtPrice: regular } : { unitPrice: regular, compareAtPrice: null };
}

/** Whole-number discount percentage for display (e.g. 20 for 20% off), or null. */
export function discountPercent(unitPrice, compareAtPrice) {
  if (!compareAtPrice) return null;
  const original = toMinor(compareAtPrice);
  if (original <= 0n) return null;
  return Number(((original - toMinor(unitPrice)) * 100n + original / 2n) / original);
}
