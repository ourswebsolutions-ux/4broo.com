// Delivery options & fees (server-only). The single place delivery prices come from.
//
// Configuration (environment, PKR):
//   DELIVERY_FEE_PKR=250                 flat standard delivery fee within Pakistan
//   FREE_DELIVERY_THRESHOLD_PKR=15000    optional: free standard delivery from this subtotal
// Nothing is invented: without DELIVERY_FEE_PKR the order is placed with the fee
// marked "to be confirmed" by the store (per the shipping policy), never a guessed amount.
// Future courier integrations can add options here behind the same quote shape.
import "server-only";
import { compareMoney, fromMinor, toMinor } from "./currency/money.js";
import { logger } from "./logger.js";

const AMOUNT = /^\d{1,10}(\.\d{1,2})?$/;
export const DOMESTIC_COUNTRY = "Pakistan";

function readAmount(name) {
  const value = process.env[name]?.trim();
  if (!value) return null;
  if (!AMOUNT.test(value)) {
    logger.warn(`${name} is not a valid PKR amount — ignored`);
    return null;
  }
  return fromMinor(toMinor(value));
}

export function getShippingConfig() {
  return { fee: readAmount("DELIVERY_FEE_PKR"), freeThreshold: readAmount("FREE_DELIVERY_THRESHOLD_PKR") };
}

const isDomestic = (country) => String(country ?? "").trim().toLowerCase() === DOMESTIC_COUNTRY.toLowerCase();

/**
 * Delivery quote for a destination and PKR subtotal.
 * @returns {{ method: "STANDARD", fee: string, confirmed: boolean, free: boolean }}
 *   confirmed=false → fee not configured for this destination; stored as 0.00 and confirmed later.
 */
export function quoteDelivery({ country, subtotal }) {
  const { fee, freeThreshold } = getShippingConfig();
  if (!isDomestic(country) || fee === null) return { method: "STANDARD", fee: "0.00", confirmed: false, free: false };
  const free = freeThreshold !== null && compareMoney(subtotal, freeThreshold) >= 0;
  return { method: "STANDARD", fee: free ? "0.00" : fee, confirmed: true, free };
}

/** The available delivery options to show at checkout (one today: standard). */
export function listDeliveryOptions({ country, subtotal }) {
  return [quoteDelivery({ country, subtotal })];
}
