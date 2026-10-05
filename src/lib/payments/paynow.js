// PayNow — integration foundation (server-only).
//
// STATUS: NOT CONNECTED. No PayNow API specification, base URL or credentials
// are available for this project, so no request format, signature scheme or
// status mapping can be implemented without guessing — and payments must never
// be guessed or simulated. Until the contract is implemented, `isConfigured()`
// is false, checkout does not offer PayNow, and every call throws a
// ConfigurationError.
//
// To connect PayNow, implement the three methods below from the provider's
// official documentation, set the environment variables, and flip
// CONTRACT_IMPLEMENTED. Everything around them (order creation, stock
// reservation, return/callback routes, idempotent status handling, stock
// release on failure/cancellation) already works through this interface.
//
//   PAYNOW_API_BASE_URL   provider API endpoint
//   PAYNOW_API_KEY        merchant/integration key   (secret — server only)
//   PAYNOW_SECRET         signing / hash secret       (secret — server only)
import "server-only";
import { ConfigurationError } from "../errors.js";

const CONTRACT_IMPLEMENTED = false;
const REQUIRED_ENV = ["PAYNOW_API_BASE_URL", "PAYNOW_API_KEY", "PAYNOW_SECRET"];

/** Why PayNow is unavailable (variable NAMES only, never values) — for diagnostics/reports. */
export function paynowMissingConfiguration() {
  const missing = REQUIRED_ENV.filter((name) => !process.env[name]?.trim());
  if (!CONTRACT_IMPLEMENTED) missing.push("PayNow API contract (request/signature/status mapping) not implemented");
  return missing;
}

function notConnected() {
  return new ConfigurationError(`PayNow is not connected: ${paynowMissingConfiguration().join(", ")}`);
}

/** @type {import("./index.js").PaymentProvider} */
export const paynowProvider = {
  method: "PAYNOW",
  isConfigured: () => paynowMissingConfiguration().length === 0,

  /** Start a hosted payment for an order; returns where to send the customer and the provider reference. */
  async createPayment(/* { order, payment, returnUrl, callbackUrl } */) {
    throw notConnected();
  },

  /** Ask the provider for the authoritative status of a transaction (never trust redirects). */
  async fetchStatus(/* reference */) {
    throw notConnected();
  },

  /** Authenticate a server-to-server callback (signature over the raw body) and return its reference. */
  async verifyCallback(/* { headers, rawBody } */) {
    throw notConnected();
  },
};
