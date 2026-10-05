// Exact decimal money arithmetic — no JavaScript floating point.
//
// Amounts travel as decimal strings ("24500.00", as Prisma Decimal serialises)
// and are computed as BigInt minor units (1/100). Works on server and client,
// so the UI can convert/format without importing Prisma.
import { BASE_CURRENCY, CURRENCIES } from "../../config/currency.js";

const SCALE = 100n; // 2 decimal places (paisa / cents)
const RATE_DECIMALS = 8; // exchange-rate precision
const RATE_SCALE = 10n ** BigInt(RATE_DECIMALS);

const DECIMAL_PATTERN = /^-?\d+(\.\d+)?$/;

/** Parse a decimal string / Prisma Decimal / integer into BigInt minor units (half-up rounding). */
export function toMinor(value) {
  const text = typeof value === "bigint" ? `${value}` : String(value ?? "").trim();
  if (!DECIMAL_PATTERN.test(text)) throw new TypeError(`Invalid money amount: ${text}`);

  const negative = text.startsWith("-");
  const [whole, fraction = ""] = text.replace("-", "").split(".");
  let minor = BigInt(whole) * SCALE + BigInt((fraction + "00").slice(0, 2));
  if (Number(fraction[2] ?? 0) >= 5) minor += 1n;
  return negative ? -minor : minor;
}

/** BigInt minor units → canonical decimal string with 2 places ("24500.00"). */
export function fromMinor(minor) {
  const negative = minor < 0n;
  const abs = negative ? -minor : minor;
  return `${negative ? "-" : ""}${abs / SCALE}.${String(abs % SCALE).padStart(2, "0")}`;
}

export const addMoney = (...amounts) => fromMinor(amounts.reduce((sum, amount) => sum + toMinor(amount), 0n));
export const subtractMoney = (a, b) => fromMinor(toMinor(a) - toMinor(b));
export const multiplyMoney = (amount, quantity) => {
  if (!Number.isInteger(quantity)) throw new TypeError("Quantity must be an integer.");
  return fromMinor(toMinor(amount) * BigInt(quantity));
};
export const compareMoney = (a, b) => {
  const diff = toMinor(a) - toMinor(b);
  return diff === 0n ? 0 : diff > 0n ? 1 : -1;
};

/**
 * Convert an amount using a decimal-string rate (units of `to` per 1 unit of `from`),
 * e.g. convertMoney("24500.00", "0.00357143") → "87.50". Half-up rounding to 2 places.
 */
export function convertMoney(amount, rate) {
  const text = String(rate);
  if (!DECIMAL_PATTERN.test(text) || text.startsWith("-")) throw new TypeError(`Invalid exchange rate: ${text}`);
  const [whole, fraction = ""] = text.split(".");
  const rateScaled = BigInt(whole) * RATE_SCALE + BigInt((fraction + "0".repeat(RATE_DECIMALS)).slice(0, RATE_DECIMALS));

  const product = toMinor(amount) * rateScaled;
  const rounded = (product + RATE_SCALE / 2n) / RATE_SCALE;
  return fromMinor(rounded);
}

/**
 * Inverse conversion: amount in the *target* currency back to the base currency,
 * e.g. a USD price-filter bound → PKR. `rate` is base→target (USD per 1 PKR).
 * `mode` controls rounding to 2 places: "floor" for lower bounds, "ceil" for upper bounds.
 */
export function convertToBase(amount, rate, mode = "round") {
  const text = String(rate);
  if (!DECIMAL_PATTERN.test(text) || text.startsWith("-") || Number(text) === 0) throw new TypeError(`Invalid exchange rate: ${text}`);
  const [whole, fraction = ""] = text.split(".");
  const rateScaled = BigInt(whole) * RATE_SCALE + BigInt((fraction + "0".repeat(RATE_DECIMALS)).slice(0, RATE_DECIMALS));

  const numerator = toMinor(amount) * RATE_SCALE;
  let quotient = numerator / rateScaled;
  const remainder = numerator % rateScaled;
  if (remainder !== 0n) {
    if (mode === "ceil") quotient += 1n;
    else if (mode === "round" && remainder * 2n >= rateScaled) quotient += 1n;
  }
  return fromMinor(quotient);
}

/**
 * Format for display. PKR shows whole rupees ("Rs 24,500"); USD shows cents ("$87.50").
 * The only place where a decimal string becomes a Number — and only for Intl formatting.
 */
export function formatMoney(amount, currency = BASE_CURRENCY) {
  const config = CURRENCIES[currency] ?? CURRENCIES[BASE_CURRENCY];
  const value = fromMinor(toMinor(amount));
  return new Intl.NumberFormat(config.locale, {
    style: "currency",
    currency: config.code,
    currencyDisplay: "narrowSymbol",
    minimumFractionDigits: config.fractionDigits,
    maximumFractionDigits: config.fractionDigits,
  }).format(Number(value));
}
