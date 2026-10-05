// Exchange-rate service (server-only). The single place rates come from.
//
// Provider today: an optional, explicitly configured value
//   EXCHANGE_RATE_PKR_USD=0.0036   (USD per 1 PKR)
// No default is invented — when unset, USD display is simply unavailable and
// the storefront shows PKR only. A live provider can implement the same
// `getRate(from, to)` contract later (with caching) without touching callers.
import "server-only";
import { BASE_CURRENCY } from "../../config/currency.js";
import { logger } from "../logger.js";
import { convertMoney } from "./money.js";

const RATE_PATTERN = /^\d+(\.\d{1,8})?$/;

const envProvider = {
  name: "environment",
  async getRate(from, to) {
    if (from === to) return { rate: "1", source: "identity", asOf: null };
    if (from === "PKR" && to === "USD") {
      const value = process.env.EXCHANGE_RATE_PKR_USD?.trim();
      if (!value) return null;
      if (!RATE_PATTERN.test(value) || Number(value) <= 0) {
        logger.warn("EXCHANGE_RATE_PKR_USD is not a valid positive decimal — USD display disabled");
        return null;
      }
      return { rate: value, source: "environment", asOf: null };
    }
    return null;
  },
};

let provider = envProvider;

/** Swap the provider (e.g. a live FX API) — intended for app bootstrap / tests. */
export function setExchangeRateProvider(next) {
  provider = next;
}

/** @returns {Promise<{ rate: string, source: string, asOf: Date | null } | null>} */
export async function getExchangeRate(from, to) {
  return provider.getRate(from, to);
}

/** Display currencies that can actually be shown right now (PKR always; USD only with a rate). */
export async function getAvailableCurrencies() {
  const usd = await getExchangeRate(BASE_CURRENCY, "USD");
  return usd ? [BASE_CURRENCY, "USD"] : [BASE_CURRENCY];
}

/** Convert a canonical PKR amount for display, or null if no rate is configured. */
export async function convertFromBase(amount, to) {
  const quote = await getExchangeRate(BASE_CURRENCY, to);
  return quote ? convertMoney(amount, quote.rate) : null;
}
