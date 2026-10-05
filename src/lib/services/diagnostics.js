// Integration health checks shared by the admin diagnostics API and the CLI
// scripts in /scripts. Results contain status + safe messages only, never secrets.
import "server-only";
import { checkDatabaseConnection } from "../db.js";
import { getConfigurationStatus } from "../env.js";
import { normalizeError } from "../errors.js";
import { getSmtpConfig, getWhatsAppConfig } from "../settings/index.js";
import { verifyCloudinary } from "./cloudinary.js";
import { sendEmail, verifyEmailTransport } from "./email.js";
import { getWhatsAppSessionStatus, sendWhatsAppText } from "./whatsapp.js";

/** SMTP / WhatsApp status from the central settings (what is missing — never values). */
async function settingsStatus() {
  const [smtp, whatsapp] = await Promise.all([getSmtpConfig(), getWhatsAppConfig()]);
  const status = (config) => (config.configured ? { configured: true } : { configured: false, problem: `missing ${config.missing.join(", ")} (set in /admin/settings or the environment)` });
  return { smtp: status(smtp), whatsapp: status(whatsapp) };
}

async function run(service, check) {
  const startedAt = Date.now();
  try {
    const detail = await check();
    return { service, ok: true, durationMs: Date.now() - startedAt, ...(detail && { detail }) };
  } catch (error) {
    const appError = normalizeError(error);
    return {
      service,
      ok: false,
      durationMs: Date.now() - startedAt,
      // internalMessage names missing variables / upstream status — never values.
      error: appError.internalMessage ?? appError.message,
    };
  }
}

export const diagnostics = {
  configuration: async () => ({ service: "configuration", ok: true, detail: { ...getConfigurationStatus(), ...(await settingsStatus()) } }),

  database: () => run("database", async () => (await checkDatabaseConnection(), "Connected")),

  email: ({ sendTo } = {}) =>
    run("email", async () => {
      await verifyEmailTransport();
      if (!sendTo) return "SMTP connection and authentication verified";
      const { messageId } = await sendEmail({
        to: sendTo,
        subject: "4 BRO — SMTP test",
        text: "This is a test message from the 4 BRO platform. SMTP is configured correctly.",
      });
      return `Test email sent (messageId ${messageId})`;
    }),

  whatsapp: ({ send = false } = {}) =>
    run("whatsapp", async () => {
      const session = await getWhatsAppSessionStatus();
      if (!send) return `Session ${session.status}${session.phone ? ` (${session.phone})` : ""} — no message sent`;
      const { adminNumber } = await getWhatsAppConfig();
      if (!adminNumber) throw new Error("No admin WhatsApp number is set — no number to test with");
      await sendWhatsAppText({
        to: adminNumber,
        text: `4 BRO — WhatsApp integration test (${new Date().toISOString()})`,
      });
      return "Test message sent to the admin number";
    }),

  cloudinary: () => run("cloudinary", async () => (await verifyCloudinary(), "Credentials verified (API ping ok)")),
};

export const DIAGNOSTIC_SERVICES = Object.keys(diagnostics);
