// Registry of admin-manageable settings: key, category, kind, environment fallback
// and validation. The single source of truth for src/lib/settings and the admin UI.
//
// Resolution order for every setting (see ./index.js):
//   1. a valid value saved by an admin (SystemSetting row)
//   2. the first non-empty environment variable in `env`
//   3. `fallback` (a safe built-in default), else "not configured"
import "server-only";
import { z } from "zod";
import { siteConfig } from "../../config/site.js";
import { toPhoneDigits } from "../../utils/phone.js";

export const CATEGORIES = {
  whatsapp: "WHATSAPP",
  smtp: "SMTP",
  business: "BUSINESS",
  notifications: "NOTIFICATIONS",
};

const SMTP_SECURITY = ["auto", "tls", "starttls"];

/** Kind → validator. Each returns { ok: true, value } or { ok: false, message }. */
const KINDS = {
  text: (raw, def) => {
    const value = String(raw).trim();
    if (value.length > (def.max ?? 120)) return { ok: false, message: `Use at most ${def.max ?? 120} characters.` };
    if (/[\r\n]/.test(value) && !def.multiline) return { ok: false, message: "Use a single line." };
    return { ok: true, value };
  },
  secret: (raw) => {
    const value = String(raw).trim();
    if (value.length > 500) return { ok: false, message: "This credential is too long." };
    if (/[\r\n]/.test(value)) return { ok: false, message: "Credentials cannot contain line breaks." };
    return { ok: true, value };
  },
  email: (raw) => {
    const result = z.email().max(191).safeParse(String(raw).trim().toLowerCase());
    return result.success ? { ok: true, value: result.data } : { ok: false, message: "Enter a valid email address." };
  },
  url: (raw, def) => {
    const value = String(raw).trim().replace(/\/+$/, "");
    const result = z.url({ protocol: /^https?$/ }).max(300).safeParse(value);
    // https only, except: allowHttp (public website URL) or a local test server (loopback) when allowLoopbackHttp.
    const http = result.success && value.startsWith("http:");
    const loopback = http && ["localhost", "127.0.0.1", "[::1]"].includes(new URL(value).hostname);
    if (result.success && (!http || def.allowHttp || (def.allowLoopbackHttp && loopback))) return { ok: true, value };
    return { ok: false, message: def.allowHttp ? "Enter a full URL starting with https:// (or http://)." : "Enter a full URL starting with https://." };
  },
  phone: (raw) => {
    const value = toPhoneDigits(raw);
    return value ? { ok: true, value } : { ok: false, message: "Enter a valid number with country code, e.g. 923001234567." };
  },
  port: (raw) => {
    const value = Number(String(raw).trim());
    return Number.isInteger(value) && value > 0 && value < 65536 ? { ok: true, value } : { ok: false, message: "Enter a port between 1 and 65535." };
  },
  boolean: (raw) => {
    if (typeof raw === "boolean") return { ok: true, value: raw };
    const value = String(raw).trim().toLowerCase();
    if (["true", "1", "yes", "on"].includes(value)) return { ok: true, value: true };
    if (["false", "0", "no", "off"].includes(value)) return { ok: true, value: false };
    return { ok: false, message: "Must be on or off." };
  },
  smtpSecurity: (raw) => {
    const value = String(raw).trim().toLowerCase();
    // Environment form: SMTP_SECURE=true|false
    if (value === "true") return { ok: true, value: "tls" };
    if (value === "false") return { ok: true, value: "starttls" };
    return SMTP_SECURITY.includes(value) ? { ok: true, value } : { ok: false, message: "Choose a connection security option." };
  },
};

const field = (key, kind, options = {}) => ({ key, kind, category: CATEGORIES[key.split(".")[0]], env: [], secret: kind === "secret", ...options });

export const SETTINGS = [
  // ── WhatsApp (WAAPI) ──
  field("whatsapp.baseUrl", "url", { label: "WhatsApp API base URL", env: ["WAAPI_BASE_URL"], fallback: "https://waapi.axorawebsolutions.com", allowLoopbackHttp: true }),
  field("whatsapp.apiKey", "secret", { label: "WhatsApp API key", env: ["WAAPI_TOKEN", "WAAPI_API_KEY"] }),
  field("whatsapp.sessionId", "secret", { label: "WhatsApp session ID", env: ["WAAPI_SESSION_ID"] }),
  field("whatsapp.adminNumber", "phone", { label: "Admin WhatsApp number", env: ["WAAPI_ADMIN_NUMBER"] }),
  field("whatsapp.enabled", "boolean", { label: "WhatsApp notifications", env: ["WHATSAPP_NOTIFICATIONS_ENABLED"], fallback: true }),

  // ── SMTP ──
  field("smtp.host", "text", { label: "SMTP host", env: ["SMTP_HOST"], max: 191 }),
  field("smtp.port", "port", { label: "SMTP port", env: ["SMTP_PORT"] }),
  field("smtp.security", "smtpSecurity", { label: "Connection security", env: ["SMTP_SECURE"], fallback: "auto" }),
  field("smtp.username", "text", { label: "SMTP username", env: ["SMTP_USERNAME", "SMTP_USER"], max: 191 }),
  field("smtp.password", "secret", { label: "SMTP password", env: ["SMTP_PASSWORD", "SMTP_PASS"] }),
  field("smtp.fromName", "text", { label: "Sender name", env: ["SMTP_FROM_NAME"], fallback: siteConfig.name, max: 80 }),
  field("smtp.fromEmail", "email", { label: "Sender email", env: ["SMTP_SENDER_EMAIL", "SMTP_FROM_EMAIL"] }),
  field("smtp.enabled", "boolean", { label: "Email notifications", env: ["EMAIL_NOTIFICATIONS_ENABLED"], fallback: true }),

  // ── Business contact (public) ──
  field("business.name", "text", { label: "Business display name", env: ["BUSINESS_NAME"], fallback: siteConfig.name, max: 80 }),
  field("business.whatsappNumber", "phone", { label: "Business WhatsApp number", env: ["PUBLIC_WHATSAPP_NUMBER", "WAAPI_ADMIN_NUMBER"] }),
  field("business.supportEmail", "email", { label: "Customer support email", env: ["PUBLIC_CONTACT_EMAIL", "SMTP_SENDER_EMAIL", "SMTP_FROM_EMAIL"] }),
  field("business.phone", "phone", { label: "Contact phone", env: ["PUBLIC_CONTACT_PHONE"] }),
  field("business.websiteUrl", "url", { label: "Website URL", env: ["NEXT_PUBLIC_SITE_URL"], fallback: siteConfig.url, allowHttp: true }),
  field("business.address", "text", { label: "Business address", env: ["PUBLIC_BUSINESS_ADDRESS"], max: 300, multiline: true }),
  field("business.instagramUrl", "url", { label: "Instagram URL", env: ["PUBLIC_INSTAGRAM_URL"] }),
  field("business.tiktokUrl", "url", { label: "TikTok URL", env: ["PUBLIC_TIKTOK_URL"] }),
  field("business.facebookUrl", "url", { label: "Facebook URL", env: ["PUBLIC_FACEBOOK_URL"] }),
  field("business.youtubeUrl", "url", { label: "YouTube URL", env: ["PUBLIC_YOUTUBE_URL"] }),

  // ── Notification preferences ──
  field("notifications.customerOrderConfirmation", "boolean", { label: "Customer order confirmation", fallback: true }),
  field("notifications.customerStatusUpdates", "boolean", { label: "Customer order-status updates", fallback: true }),
  field("notifications.customerPayment", "boolean", { label: "Customer payment confirmation", fallback: true }),
  field("notifications.customerEmailFallback", "boolean", { label: "Email fallback when WhatsApp fails", fallback: true }),
  field("notifications.adminNewOrderWhatsApp", "boolean", { label: "Admin new-order WhatsApp alert", fallback: true }),
  field("notifications.adminNewOrderEmail", "boolean", { label: "Admin new-order email alert", fallback: true }),
  field("notifications.adminEmail", "email", { label: "Admin notification email", env: ["ADMIN_NOTIFICATION_EMAIL", "ADMIN_EMAIL"] }),
];

export const SETTINGS_BY_KEY = new Map(SETTINGS.map((def) => [def.key, def]));

export const settingsIn = (category) => SETTINGS.filter((def) => def.category === category);

/** Validate a raw value for a setting. Empty → { ok: true, value: null }. */
export function parseSettingValue(def, raw) {
  if (raw === undefined || raw === null || (typeof raw === "string" && raw.trim() === "")) return { ok: true, value: null };
  return KINDS[def.kind](raw, def);
}
