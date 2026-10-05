// Transactional email over SMTP (Nodemailer). Server-only.
//
// Order notifications, admin alerts and password reset build their subject/html/text
// and call `sendEmail`. Connection details and the sender come from the central
// settings (admin-saved → environment fallback); the transporter is rebuilt when
// they change, so a new app password applies without a restart.
import "server-only";
import { createHash } from "node:crypto";
import nodemailer from "nodemailer";
import { servicesConfig } from "../../config/server.js";
import { AppError, ConfigurationError, ExternalServiceError, ValidationError } from "../errors.js";
import { logger } from "../logger.js";
import { getSmtpConfig } from "../settings/index.js";

let transporter = null; // { fingerprint, instance }

/** Map a Nodemailer failure to a safe error (SMTP transcripts can contain sensitive data). */
function toServiceError(action, error) {
  if (error instanceof AppError) return error;
  return new ExternalServiceError("email", `${action}: ${error.code ?? "UNKNOWN"} ${error.responseCode ?? ""}`.trim(), {
    cause: new Error(error.message),
  });
}

async function requireConfig() {
  const config = await getSmtpConfig();
  if (!config.configured) throw new ConfigurationError(`SMTP is not configured: missing ${config.missing.join(", ")}`);
  return config;
}

/** One transporter per distinct configuration (keyed by a hash, never the values). */
function getTransporter(config) {
  const fingerprint = createHash("sha256").update(JSON.stringify([config.host, config.port, config.secure, config.username, config.password])).digest("hex");
  if (transporter?.fingerprint === fingerprint) return transporter.instance;
  transporter?.instance.close();

  const { timeoutMs } = servicesConfig.email;
  const instance = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: { user: config.username, pass: config.password },
    connectionTimeout: timeoutMs,
    greetingTimeout: timeoutMs,
    socketTimeout: timeoutMs * 2,
    tls: { minVersion: "TLSv1.2" },
  });
  transporter = { fingerprint, instance };
  return instance;
}

const sender = (config) => ({ name: config.fromName || servicesConfig.email.senderName, address: config.fromEmail });

/**
 * Send an email.
 * @param {{ to: string | string[], subject: string, html?: string, text?: string, replyTo?: string }} message
 * @returns {Promise<{ messageId: string }>}
 */
export async function sendEmail({ to, subject, html, text, replyTo }) {
  if (!to || !subject || (!html && !text)) {
    throw new ValidationError("Email requires a recipient, subject and body.");
  }

  const config = await requireConfig();
  try {
    const info = await getTransporter(config).sendMail({ from: sender(config), to, subject, html, text, replyTo });
    logger.info("Email sent", { messageId: info.messageId, subject });
    return { messageId: info.messageId };
  } catch (error) {
    const failure = toServiceError("SMTP send failed", error);
    logger.error("Email delivery failed", { error: failure, subject });
    throw failure;
  }
}

/** Verify SMTP connectivity + credentials without sending anything. */
export async function verifyEmailTransport() {
  const config = await requireConfig();
  try {
    await getTransporter(config).verify();
    return true;
  } catch (error) {
    throw toServiceError("SMTP verification failed", error);
  }
}

/** Escape user-provided values before interpolating them into HTML email templates. */
export function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
