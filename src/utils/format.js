import { BASE_CURRENCY } from "@/config/currency";
import { formatMoney } from "@/lib/currency/money";

/** Format a money amount (decimal string or Prisma Decimal) — PKR by default. */
export function formatPrice(amount, currency = BASE_CURRENCY) {
  return formatMoney(String(amount), currency);
}

export function formatDate(value, locale = "en-GB") {
  return new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", year: "numeric" }).format(new Date(value));
}
