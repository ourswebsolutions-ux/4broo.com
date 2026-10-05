// Authorization guards — the single source of truth for who may do what.
//
// Page guards (requireUser / requireAdmin) redirect or 404.
// API/action guards (assertUser / assertAdmin) throw AppErrors handled by the API layer.
// The proxy only performs an optimistic cookie check; THESE checks are authoritative.
import "server-only";
import { notFound, redirect } from "next/navigation";
import { routes } from "../../config/site.js";
import { localizeHref } from "../../i18n/navigation.js";
import { AuthenticationError, AuthorizationError } from "../errors.js";
import { getCurrentUser } from "./session.js";

export const ROLES = Object.freeze({ CUSTOMER: "CUSTOMER", ADMIN: "ADMIN" });

export const isAdmin = (user) => user?.role === ROLES.ADMIN;

/** For customer pages: signed-in users only. `locale` keeps the visitor in their language. */
export async function requireUser({ redirectTo, locale } = {}) {
  const user = await getCurrentUser();
  if (!user) {
    const next = redirectTo ? `?next=${encodeURIComponent(localizeHref(redirectTo, locale))}` : "";
    redirect(`${localizeHref(routes.login, locale)}${next}`);
  }
  return user;
}

/** For customer account pages: signed-in CUSTOMER accounts; admins are sent to the admin area. */
export async function requireCustomer(options) {
  const user = await requireUser(options);
  if (user.role !== ROLES.CUSTOMER) redirect(routes.admin);
  return user;
}

/**
 * For admin pages. Signed-out visitors go to the admin login; signed-in
 * non-admins get a 404 so the admin area's existence is not confirmed.
 */
export async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user) redirect(routes.adminLogin);
  if (!isAdmin(user)) notFound();
  return user;
}

/** For Route Handlers / Server Actions. */
export async function assertUser() {
  const user = await getCurrentUser();
  if (!user) throw new AuthenticationError();
  return user;
}

/** Customer-only operations (cart, wishlist, saved items, addresses, profile). */
export async function assertCustomer() {
  const user = await assertUser();
  if (user.role !== ROLES.CUSTOMER) throw new AuthorizationError("Shopping is available with a customer account.");
  return user;
}

export async function assertAdmin() {
  const user = await assertUser();
  if (!isAdmin(user)) throw new AuthorizationError();
  return user;
}
