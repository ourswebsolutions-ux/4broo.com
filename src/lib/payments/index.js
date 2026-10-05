// Payment methods & providers (server-only).
//
// @typedef {object} PaymentProvider
// @property {"PAYNOW"} method
// @property {() => boolean} isConfigured
// @property {(input: { order: object, payment: object, returnUrl: string, callbackUrl: string }) => Promise<{ redirectUrl: string, reference: string, data?: object }>} createPayment
// @property {(reference: string) => Promise<{ status: "PAID"|"FAILED"|"CANCELLED"|"PENDING", amount: string, currency: string, reference: string, data?: object }>} fetchStatus
// @property {(input: { headers: Headers, rawBody: string }) => Promise<{ reference: string }>} verifyCallback
import "server-only";
import { paynowProvider } from "./paynow.js";

const PROVIDERS = { PAYNOW: paynowProvider };

export const getPaymentProvider = (method) => PROVIDERS[method] ?? null;

/** Methods offered at checkout. COD is always available; online methods only when truly connected. */
export function listPaymentMethods() {
  return [
    { method: "COD", available: true },
    { method: "PAYNOW", available: paynowProvider.isConfigured() },
  ];
}

export const isPaymentMethodAvailable = (method) => listPaymentMethods().some((entry) => entry.method === method && entry.available);
