// Currency configuration (public, non-secret). Safe on server and client.
//
// PKR is the canonical currency: every price in the database is PKR.
// USD is a display currency derived by conversion — never stored as a source of truth.

export const BASE_CURRENCY = "PKR";

export const CURRENCIES = {
  PKR: { code: "PKR", label: "Pakistani Rupee", symbol: "Rs", locale: "en-PK", fractionDigits: 0 },
  USD: { code: "USD", label: "US Dollar", symbol: "$", locale: "en-US", fractionDigits: 2 },
};

export const SUPPORTED_CURRENCIES = Object.keys(CURRENCIES);

/** Cookie a future currency switcher will use to remember the shopper's display currency. */
export const CURRENCY_COOKIE = "4bro_currency";

export const isSupportedCurrency = (code) => SUPPORTED_CURRENCIES.includes(code);
