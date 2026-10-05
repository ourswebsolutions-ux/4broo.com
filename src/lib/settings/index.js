// Centralised, server-only configuration for WhatsApp, SMTP, business contact and
// notification preferences. Every integration reads its settings here.
//
// Priority per setting: saved admin value (database) → environment variable →
// built-in default → not configured. Credentials saved in the database are
// AES-256-GCM encrypted (../security/encryption.js) and only decrypted here, on
// the server; nothing in this module is ever passed to client components except
// getPublicContact() (public contact details, no secrets).
//
// Caching: one small table read per process, cached briefly and dropped
// immediately when an admin saves (invalidateSettings), so changes apply without
// a restart. If the table cannot be read (e.g. migration not yet applied) the
// environment configuration keeps working.
import "server-only";
import { getDb } from "../db.js";
import { logger } from "../logger.js";
import { decryptSecret } from "../security/encryption.js";
import { SETTINGS, parseSettingValue } from "./definitions.js";

const TTL_MS = 30_000;
const RETRY_AFTER_DB_ERROR_MS = 5_000;

let cache = null; // { expiresAt, promise }
let warnedDbUnavailable = false;

/** Drop the cached snapshot (call after any settings write). */
export function invalidateSettings() {
  cache = null;
}

function fromEnvironment(def) {
  for (const name of def.env) {
    const raw = process.env[name];
    if (raw === undefined || raw === "") continue;
    const parsed = parseSettingValue(def, raw);
    if (parsed.ok && parsed.value !== null) return { value: parsed.value, envName: name };
    return { value: null, envName: name, problem: `${name} is invalid (${parsed.message ?? "empty"})` };
  }
  return null;
}

function fromDatabase(def, row) {
  if (!row) return null;
  try {
    if (def.secret) {
      if (!row.ciphertext) throw new Error("missing ciphertext");
      return { value: decryptSecret(row, def.key) };
    }
    const parsed = parseSettingValue(def, JSON.parse(row.value ?? "null"));
    if (!parsed.ok || parsed.value === null) return { value: null, problem: `Saved value for ${def.label} is invalid` };
    return { value: parsed.value };
  } catch (error) {
    return { value: null, problem: error?.internalMessage ?? `Saved value for ${def.label} could not be read` };
  }
}

/** Resolve one setting → { value, source, ...metadata }. Values of secrets never leave the server. */
function resolve(def, row) {
  const db = fromDatabase(def, row);
  const env = fromEnvironment(def);
  const meta = {
    stored: Boolean(row),
    storedAt: row?.updatedAt ?? null,
    storedKeyId: row?.keyId ?? null,
    dbProblem: db?.problem ?? null,
    envName: env?.envName ?? null,
    envAvailable: env?.value != null,
    envProblem: env?.problem ?? null,
  };
  if (db?.value != null) return { value: db.value, source: "database", ...meta };
  if (env?.value != null) return { value: env.value, source: "environment", ...meta };
  if (def.fallback !== undefined) return { value: def.fallback, source: "default", ...meta };
  return { value: null, source: "unset", ...meta };
}

async function buildSnapshot() {
  let rows = [];
  let databaseProblem = null;
  try {
    rows = await getDb().systemSetting.findMany();
    warnedDbUnavailable = false;
  } catch (error) {
    databaseProblem = "Saved settings could not be read from the database — using environment configuration.";
    if (!warnedDbUnavailable) {
      warnedDbUnavailable = true;
      logger.warn("Settings table unavailable; using environment configuration", { code: error?.code });
    }
  }
  const byKey = new Map(rows.map((row) => [row.key, row]));
  const fields = Object.fromEntries(SETTINGS.map((def) => [def.key, resolve(def, byKey.get(def.key))]));
  return { fields, databaseProblem };
}

/** Full resolved snapshot (server-only; includes decrypted credentials). */
export async function getSettingsSnapshot() {
  const now = Date.now();
  if (cache && cache.expiresAt > now) return cache.promise;
  const promise = buildSnapshot();
  cache = { expiresAt: now + TTL_MS, promise };
  promise.then(
    (snapshot) => {
      if (snapshot.databaseProblem && cache?.promise === promise) cache.expiresAt = Date.now() + RETRY_AFTER_DB_ERROR_MS;
    },
    () => {
      if (cache?.promise === promise) cache = null;
    },
  );
  return promise;
}

const valueOf = (snapshot, key) => snapshot.fields[key]?.value ?? null;

/** WAAPI configuration (server-only — contains the API key). */
export async function getWhatsAppConfig() {
  const s = await getSettingsSnapshot();
  const config = {
    baseUrl: valueOf(s, "whatsapp.baseUrl"),
    apiKey: valueOf(s, "whatsapp.apiKey"),
    sessionId: valueOf(s, "whatsapp.sessionId"),
    adminNumber: valueOf(s, "whatsapp.adminNumber"),
    enabled: valueOf(s, "whatsapp.enabled") !== false,
  };
  config.missing = [!config.apiKey && "API key", !config.sessionId && "session ID"].filter(Boolean);
  config.configured = config.missing.length === 0;
  return config;
}

/** SMTP configuration (server-only — contains the password). */
export async function getSmtpConfig() {
  const s = await getSettingsSnapshot();
  const port = valueOf(s, "smtp.port");
  const security = valueOf(s, "smtp.security") ?? "auto";
  const config = {
    host: valueOf(s, "smtp.host"),
    port,
    security,
    // Implicit TLS on 465 unless told otherwise; STARTTLS (upgraded, TLS ≥ 1.2) otherwise.
    secure: security === "tls" ? true : security === "starttls" ? false : port === 465,
    username: valueOf(s, "smtp.username"),
    password: valueOf(s, "smtp.password"),
    fromName: valueOf(s, "smtp.fromName"),
    fromEmail: valueOf(s, "smtp.fromEmail"),
    enabled: valueOf(s, "smtp.enabled") !== false,
  };
  config.missing = [!config.host && "host", !config.port && "port", !config.username && "username", !config.password && "password", !config.fromEmail && "sender email"].filter(Boolean);
  config.configured = config.missing.length === 0;
  return config;
}

/** Notification preferences, with resolved admin recipients. */
export async function getNotificationPreferences() {
  const s = await getSettingsSnapshot();
  const on = (key) => valueOf(s, key) !== false;
  return {
    customer: {
      orderConfirmation: on("notifications.customerOrderConfirmation"),
      statusUpdates: on("notifications.customerStatusUpdates"),
      payment: on("notifications.customerPayment"),
      emailFallback: on("notifications.customerEmailFallback"),
    },
    admin: {
      newOrderWhatsApp: on("notifications.adminNewOrderWhatsApp"),
      newOrderEmail: on("notifications.adminNewOrderEmail"),
      number: valueOf(s, "whatsapp.adminNumber"),
      // Defaults to the sender address, as before.
      email: valueOf(s, "notifications.adminEmail") ?? valueOf(s, "smtp.fromEmail"),
    },
    whatsappEnabled: on("whatsapp.enabled"),
    emailEnabled: on("smtp.enabled"),
  };
}

/**
 * Public-facing business contact details for the storefront (footer, contact page,
 * WhatsApp button) and customer messages. Not secret — safe to pass to client components.
 */
export async function getPublicContact() {
  const s = await getSettingsSnapshot();
  const website = valueOf(s, "business.websiteUrl");
  return {
    name: valueOf(s, "business.name"),
    whatsappNumber: valueOf(s, "business.whatsappNumber"),
    email: valueOf(s, "business.supportEmail"),
    phone: valueOf(s, "business.phone"),
    address: valueOf(s, "business.address"),
    websiteUrl: website,
    websiteLabel: website ? new URL(website).host.replace(/^www\./, "") : null,
    social: [
      { name: "Instagram", href: valueOf(s, "business.instagramUrl") },
      { name: "TikTok", href: valueOf(s, "business.tiktokUrl") },
      { name: "Facebook", href: valueOf(s, "business.facebookUrl") },
      { name: "YouTube", href: valueOf(s, "business.youtubeUrl") },
    ].filter((item) => item.href),
  };
}
