// Shared envelope for admin Server Actions.
//
// Every admin mutation goes through runAdminAction, which (1) re-verifies the
// ADMIN role server-side — Server Actions are public HTTP endpoints, so page
// protection alone is not enough — and (2) returns a serialisable result the
// UI can turn into toasts / field errors without leaking internals.
import "server-only";
import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { DEFAULT_LOCALE, isSupportedLocale } from "../i18n/config.js";
import { getTranslator } from "../i18n/server.js";
import { assertAdmin, assertCustomer } from "./auth/guards.js";
import { normalizeError } from "./errors.js";
import { logger } from "./logger.js";

/**
 * @template T
 * @param {string} name  for logs
 * @param {(admin: object) => Promise<T>} task
 * @returns {Promise<{ ok: true, data: T } | { ok: false, message: string, fieldErrors?: Record<string, string[]>, code: string }>}
 */
export async function runAdminAction(name, task) {
  try {
    const admin = await assertAdmin();
    const data = await task(admin);
    return { ok: true, data: data ?? null };
  } catch (error) {
    const appError = normalizeError(error);
    if (appError.status >= 500) {
      const errorId = randomUUID();
      logger.error(`Admin action failed: ${name}`, { errorId, error });
      return { ok: false, code: appError.code, message: `${appError.message} (Ref: ${errorId.slice(0, 8)})` };
    }
    return { ok: false, code: appError.code, message: appError.message, fieldErrors: appError.fieldErrors };
  }
}

/** Storefront pages (all locales) are ISR-cached — refresh them after catalogue changes. */
export function revalidateStorefront() {
  revalidatePath("/[locale]", "layout");
}

// ─── Customer actions ────────────────────────────────────────────────────────

/** Field → dictionary key for validation messages shown to customers. */
const FIELD_MESSAGES = {
  email: "validation.email",
  firstName: "validation.name",
  lastName: "validation.name",
  phone: "validation.phone",
  password: "validation.password",
  newPassword: "validation.password",
  confirmPassword: "validation.passwordMatch",
  currentPassword: "validation.currentPassword",
  fullName: "validation.fullName",
  addressLine: "validation.addressLine",
  city: "validation.city",
  postalCode: "validation.postalCode",
  country: "validation.country",
  label: "validation.label",
  whatsappNumber: "validation.phone",
  addressId: "validation.addressChoice",
  paymentMethod: "validation.paymentMethod",
  idempotencyKey: "validation.form",
};

/** Replace server validation messages with localised, field-specific ones. */
export function localizeFieldErrors(fieldErrors, t) {
  if (!fieldErrors) return undefined;
  return Object.fromEntries(Object.keys(fieldErrors).map((field) => [field, [t(FIELD_MESSAGES[field] ?? "validation.invalid")]]));
}

const CODE_MESSAGES = {
  UNAUTHENTICATED: "errors.signIn",
  FORBIDDEN: "errors.customerOnly",
  NOT_FOUND: "errors.notFound",
  RATE_LIMITED: "errors.rateLimited",
  VALIDATION_ERROR: "validation.form",
  SERVICE_UNAVAILABLE: "errors.service",
  EXTERNAL_SERVICE_ERROR: "errors.service",
};

/** A customer-safe, localised failure envelope for any thrown value. */
export function customerFailure(error, name, t) {
  const appError = normalizeError(error);
  if (appError.status >= 500 && appError.code !== "SERVICE_UNAVAILABLE" && appError.code !== "EXTERNAL_SERVICE_ERROR") {
    const errorId = randomUUID();
    logger.error(`Customer action failed: ${name}`, { errorId, error });
    return { ok: false, code: appError.code, message: `${t("errors.generic")} (Ref: ${errorId.slice(0, 8)})` };
  }
  const message = appError.i18n ? t(appError.i18n.key, appError.i18n.vars) : t(CODE_MESSAGES[appError.code] ?? "errors.generic");
  return { ok: false, code: appError.code, message, fieldErrors: localizeFieldErrors(appError.fieldErrors, t) };
}

/**
 * Envelope for storefront customer mutations (cart, wishlist, saved items,
 * profile, addresses). Identity comes ONLY from the server-side session; the
 * CUSTOMER role is enforced; messages are returned in the shopper's language.
 *
 * @param {string} name   for logs
 * @param {string} locale validated against the supported locales
 * @param {(user: object, t: Function) => Promise<any>} task
 */
export async function runCustomerAction(name, locale, task) {
  const t = await getTranslator(isSupportedLocale(locale) ? locale : DEFAULT_LOCALE);
  try {
    const user = await assertCustomer();
    const data = await task(user, t);
    return { ok: true, data: data ?? null };
  } catch (error) {
    return customerFailure(error, name, t);
  }
}
