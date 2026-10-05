"use server";

// Authentication Server Actions. All input is re-validated here regardless of
// any client-side checks. Roles are never accepted from the client: new
// accounts are always CUSTOMER; admins are created via `npm run admin:create`.
// Customer-facing messages are returned in the visitor's language (`locale`
// form field, validated); the admin login stays English.
import { randomUUID } from "node:crypto";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { authConfig } from "@/config/server";
import { routes, siteConfig } from "@/config/site";
import { DEFAULT_LOCALE, isSupportedLocale } from "@/i18n/config";
import { localizeHref } from "@/i18n/navigation";
import { getTranslator } from "@/i18n/server";
import { localizeFieldErrors } from "@/lib/actions";
import { ROLES } from "@/lib/auth/guards";
import { getDummyPasswordHash, hashPassword, passwordNeedsRehash, verifyPassword } from "@/lib/auth/password";
import { findResetToken } from "@/lib/auth/passwordReset";
import { createSession, destroyAllSessionsForUser, destroySession, getClientIp } from "@/lib/auth/session";
import { generateToken, hashToken } from "@/lib/auth/tokens";
import { getDb, withTransaction } from "@/lib/db";
import { normalizeError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { rateLimit, resetRateLimit } from "@/lib/security/rate-limit";
import { escapeHtml, sendEmail } from "@/lib/services/email";
import { formDataToObject, safeValidate } from "@/lib/validation";
import { forgotPasswordSchema, loginSchema, registerSchema, resetPasswordSchema } from "@/lib/validation/schemas/auth";

const localeOf = (input) => (isSupportedLocale(input?.locale) ? input.locale : DEFAULT_LOCALE);

/** Turn unexpected failures into a safe, localised form message (details stay in server logs). */
function failure(error, context, t) {
  const appError = normalizeError(error);
  if (appError.code === "RATE_LIMITED") return { message: t("errors.rateLimited") };
  if (appError.status < 500) return { message: t("errors.generic") };

  const errorId = randomUUID();
  logger.error(`${context} failed`, { errorId, error });
  return { message: `${t("errors.generic")} (Ref: ${errorId.slice(0, 8)})` };
}

/** Client IP from the reverse proxy, or null when unknown (no shared "unknown" bucket). */
async function clientIp() {
  return getClientIp(await headers()) ?? null;
}

// ─── Register ────────────────────────────────────────────────────────────────

export async function registerAction(_prevState, formData) {
  const input = formDataToObject(formData);
  const locale = localeOf(input);
  const t = await getTranslator(locale);
  const values = { firstName: input.firstName, lastName: input.lastName, email: input.email };

  const parsed = safeValidate(registerSchema, input);
  if (!parsed.success) return { fieldErrors: localizeFieldErrors(parsed.fieldErrors, t), values };

  const { firstName, lastName, email, password, redirectTo } = parsed.data;
  const emailTaken = { fieldErrors: { email: [t("auth.emailTaken")] }, values };
  let target;

  try {
    const ip = await clientIp();
    if (ip) rateLimit(`register:${ip}`, authConfig.rateLimit.register);

    const db = getDb();
    const existing = await db.user.findUnique({ where: { email }, select: { id: true } });
    if (existing) return emailTaken;

    const user = await db.user.create({
      data: { firstName, lastName, email, passwordHash: await hashPassword(password), role: ROLES.CUSTOMER },
      select: { id: true, role: true },
    });

    await createSession(user);
    target = redirectTo ?? localizeHref(routes.account, locale);
  } catch (error) {
    if (normalizeError(error).code === "CONFLICT") return emailTaken;
    return { ...failure(error, "Registration", t), values };
  }

  // redirect() throws internally, so it must run outside the try/catch.
  redirect(target);
}

// ─── Login ───────────────────────────────────────────────────────────────────

/**
 * Shared credential check. Always performs a password hash comparison,
 * even for unknown emails, so response timing does not reveal registered accounts.
 */
async function authenticate(email, password, { requireRole } = {}) {
  const user = await getDb().user.findUnique({
    where: { email },
    select: { id: true, role: true, status: true, passwordHash: true },
  });

  const passwordValid = await verifyPassword(password, user?.passwordHash ?? (await getDummyPasswordHash()));
  if (!user || !passwordValid || user.status !== "ACTIVE") return null;
  if (requireRole && user.role !== requireRole) return null;

  const updates = { lastLoginAt: new Date() };
  if (passwordNeedsRehash(user.passwordHash)) updates.passwordHash = await hashPassword(password);
  await getDb().user.update({ where: { id: user.id }, data: updates });

  return user;
}

async function signIn(formData, { requireRole, defaultRedirect, context }) {
  const input = formDataToObject(formData);
  const locale = localeOf(input);
  const t = await getTranslator(locale);
  const values = { email: input.email };

  const parsed = safeValidate(loginSchema, input);
  if (!parsed.success) return { fieldErrors: localizeFieldErrors(parsed.fieldErrors, t), values };

  const { email, password, redirectTo } = parsed.data;
  let target;

  try {
    const ip = await clientIp();
    const accountKey = `login:${email}:${ip ?? "-"}`;
    if (ip) rateLimit(`login:ip:${ip}`, { ...authConfig.rateLimit.login, limit: authConfig.rateLimit.login.limit * 4 });
    rateLimit(accountKey, authConfig.rateLimit.login);

    const user = await authenticate(email, password, { requireRole });
    if (!user) return { message: t("auth.invalidCredentials"), values };
    resetRateLimit(accountKey);

    // Rotate: drop any pre-existing session before issuing a new one (prevents fixation).
    await destroySession();
    await createSession(user);

    target = redirectTo ?? (user.role === ROLES.ADMIN ? routes.admin : localizeHref(defaultRedirect, locale));
  } catch (error) {
    return { ...failure(error, context, t), values };
  }

  redirect(target);
}

export async function loginAction(_prevState, formData) {
  return signIn(formData, { defaultRedirect: routes.account, context: "Login" });
}

/** Admin login only accepts ADMIN accounts; any other account gets the generic credentials error. */
export async function adminLoginAction(_prevState, formData) {
  return signIn(formData, { requireRole: ROLES.ADMIN, defaultRedirect: routes.admin, context: "Admin login" });
}

// ─── Logout ──────────────────────────────────────────────────────────────────

export async function logoutAction(formData) {
  const locale = localeOf(formData instanceof FormData ? formDataToObject(formData) : null);
  try {
    await destroySession();
  } catch (error) {
    logger.error("Logout failed", { error });
  }
  redirect(localizeHref(routes.home, locale));
}

// ─── Password reset ──────────────────────────────────────────────────────────

/**
 * Always answers with the same message, whether or not the email has an account
 * (no account enumeration). Tokens are random, stored only as an HMAC, single-use
 * and expire after authConfig.passwordResetTtlMs.
 */
export async function forgotPasswordAction(_prevState, formData) {
  const input = formDataToObject(formData);
  const locale = localeOf(input);
  const t = await getTranslator(locale);
  const values = { email: input.email };

  const parsed = safeValidate(forgotPasswordSchema, input);
  if (!parsed.success) return { fieldErrors: localizeFieldErrors(parsed.fieldErrors, t), values };
  const { email } = parsed.data;

  try {
    const ip = await clientIp();
    if (ip) rateLimit(`reset:ip:${ip}`, authConfig.rateLimit.passwordReset);
    rateLimit(`reset:${email}`, authConfig.rateLimit.passwordReset);

    const db = getDb();
    const user = await db.user.findUnique({ where: { email }, select: { id: true, firstName: true, status: true, role: true } });
    if (user && user.status === "ACTIVE" && user.role === ROLES.CUSTOMER) {
      const token = generateToken();
      await db.$transaction([
        // Only the newest link works.
        db.passwordResetToken.deleteMany({ where: { userId: user.id, usedAt: null } }),
        db.passwordResetToken.create({ data: { userId: user.id, tokenHash: hashToken(token), expiresAt: new Date(Date.now() + authConfig.passwordResetTtlMs) } }),
      ]);
      await deliverResetLink({ email, firstName: user.firstName, token, locale, t });
    }
  } catch (error) {
    if (normalizeError(error).code === "RATE_LIMITED") return { message: t("errors.rateLimited"), values };
    // Delivery/storage problems are logged; the visitor still gets the neutral answer.
    logger.error("Password reset request failed", { error });
  }

  return { success: t("auth.resetSent") };
}

async function deliverResetLink({ email, firstName, token, locale, t }) {
  // The link is built from the configured site URL — never from request headers
  // (a forged Host header must not be able to redirect reset links).
  const url = new URL(`${localizeHref("/reset-password", locale)}?token=${encodeURIComponent(token)}`, siteConfig.url).toString();
  const subject = t("emails.resetSubject");
  const lines = [t("emails.greeting", { name: firstName }), t("emails.resetIntro"), url, t("emails.resetIgnore")];

  try {
    await sendEmail({
      to: email,
      subject,
      text: lines.join("\n\n"),
      html: `<div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.6;color:#0b0b0a">
<p>${escapeHtml(lines[0])}</p><p>${escapeHtml(lines[1])}</p>
<p><a href="${escapeHtml(url)}" style="display:inline-block;background:#0b0b0a;color:#f5f3ee;padding:12px 24px;text-decoration:none;letter-spacing:.15em;font-size:12px">${escapeHtml(t("emails.resetButton"))}</a></p>
<p style="color:#6b6b66;font-size:13px">${escapeHtml(lines[3])}</p></div>`,
    });
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      // Development without SMTP: surface the link in the server log so the flow can be tested.
      logger.warn("Password reset email not sent (development) — reset link follows", { url });
      return;
    }
    throw error;
  }
}

export async function resetPasswordAction(_prevState, formData) {
  const input = formDataToObject(formData);
  const locale = localeOf(input);
  const t = await getTranslator(locale);

  const parsed = safeValidate(resetPasswordSchema, input);
  if (!parsed.success) return { fieldErrors: localizeFieldErrors(parsed.fieldErrors, t) };

  try {
    const ip = await clientIp();
    if (ip) rateLimit(`reset-submit:${ip}`, authConfig.rateLimit.passwordReset);

    const row = await findResetToken(parsed.data.token);
    if (!row) return { invalid: true, message: t("auth.resetInvalid") };

    const passwordHash = await hashPassword(parsed.data.password);
    await withTransaction(async (tx) => {
      // Single use, even under concurrent submissions.
      const { count } = await tx.passwordResetToken.updateMany({ where: { id: row.id, usedAt: null }, data: { usedAt: new Date() } });
      if (!count) throw Object.assign(new Error("Reset token already used"), { code: "TOKEN_USED" });
      await tx.user.update({ where: { id: row.userId }, data: { passwordHash } });
    });
    // Every existing session (possibly an attacker's) is signed out.
    await destroyAllSessionsForUser(row.userId);
  } catch (error) {
    if (error?.code === "TOKEN_USED") return { invalid: true, message: t("auth.resetInvalid") };
    return failure(error, "Password reset", t);
  }

  redirect(`${localizeHref(routes.login, locale)}?reset=1`);
}
