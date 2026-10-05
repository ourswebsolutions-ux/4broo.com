// WhatsApp messaging through WAAPI. Server-only — the API key and session id never
// reach the browser, and there is no public endpoint that sends arbitrary messages.
// Credentials come from the central settings (admin-saved → environment fallback).
//
// API (verified against https://waapi.axorawebsolutions.com/docs/messages-text):
//   POST {origin}/api/v1/messages/text
//   Authorization: Bearer <WAAPI_API_KEY>
//   { "sessionId": "...", "to": "923001234567", "text": "..." }
//   200 → { "success": true, "data": { "messageId": "3EB0…", "to": "923…" }, "credits": {…} }
//   4xx → { "success": false, "error": "Insufficient credit balance", … }
//   GET {origin}/api/v1/session/status?sessionId=…  (free; connection check)
//   200 → { "success": true, "data": { "status": "CONNECTED", "phone": "923…", "isSocketLive": true } }
import "server-only";
import { servicesConfig } from "../../config/server.js";
import { ConfigurationError, ExternalServiceError, ValidationError } from "../errors.js";
import { logger } from "../logger.js";
import { getWhatsAppConfig } from "../settings/index.js";
import { toPhoneDigits } from "../../utils/phone.js";

const MAX_TEXT_LENGTH = 4096;
/** Retried only when the request certainly did not reach WAAPI or WAAPI asked us to come back. */
const RETRYABLE_STATUS = new Set([429, 502, 503, 504]);
const MAX_ATTEMPTS = 3;

/**
 * WAAPI expects digits only, with country code and no "+" (e.g. 923001234567).
 * Pakistani local numbers (03001234567) are converted to the international form.
 */
export function normalizeWhatsAppNumber(number) {
  const digits = toPhoneDigits(number);
  if (!digits) throw new ValidationError("Invalid WhatsApp number.", { to: ["Enter a valid number with country code."] });
  return digits;
}

export const maskNumber = (digits) => `${String(digits).slice(0, 3)}****${String(digits).slice(-3)}`;

/** Accepts the API origin, …/api/v1, or the full text endpoint as the base URL. */
function endpointOf(baseUrl, path = servicesConfig.whatsapp.textMessagePath) {
  const url = new URL(baseUrl);
  return new URL(path, url.origin);
}

/** Configuration with credentials, or a ConfigurationError naming what is missing (never values). */
async function requireConfig() {
  const config = await getWhatsAppConfig();
  if (!config.configured) throw new ConfigurationError(`WhatsApp is not configured: missing ${config.missing.join(", ")}`);
  return config;
}

/** Turn a WAAPI non-success response into a safe error (provider message only, no request data). */
function rejection(action, response, payload) {
  const upstream = typeof payload?.error === "string" ? payload.error.slice(0, 200) : `HTTP ${response.status}`;
  return new ExternalServiceError("whatsapp", `WAAPI ${action}: ${upstream}`, { upstreamStatus: response.status });
}

/** A connection-level failure where the request was never accepted (safe to retry). */
const isConnectionError = (error) => ["ECONNREFUSED", "ECONNRESET", "ENOTFOUND", "EAI_AGAIN", "UND_ERR_CONNECT_TIMEOUT"].includes(error?.cause?.code ?? error?.code);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Send a WhatsApp text message.
 * Timeouts are NOT retried: the message may already have been delivered, and a
 * duplicate customer message is worse than falling back to email.
 * @param {{ to: string, text: string }} message
 * @returns {Promise<{ messageId: string|null, to: string }>}
 */
export async function sendWhatsAppText({ to, text }) {
  const config = await requireConfig();
  const recipient = normalizeWhatsAppNumber(to);
  const body = String(text ?? "").trim();
  if (!body) throw new ValidationError("WhatsApp message text is required.");
  if (body.length > MAX_TEXT_LENGTH) throw new ValidationError("WhatsApp message is too long.");

  const endpoint = endpointOf(config.baseUrl);
  const request = {
    method: "POST",
    headers: { Authorization: `Bearer ${config.apiKey}`, "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ sessionId: config.sessionId, to: recipient, text: body }),
    cache: "no-store",
  };

  for (let attempt = 1; ; attempt++) {
    let response;
    try {
      response = await fetch(endpoint, { ...request, signal: AbortSignal.timeout(servicesConfig.whatsapp.timeoutMs) });
    } catch (error) {
      if (isConnectionError(error) && attempt < MAX_ATTEMPTS) {
        await sleep(400 * attempt);
        continue;
      }
      const reason = error?.name === "TimeoutError" ? "request timed out" : "network error";
      const failure = new ExternalServiceError("whatsapp", `WAAPI ${reason}`, { cause: error });
      logger.error("WhatsApp send failed", { reason, to: maskNumber(recipient), attempt });
      throw failure;
    }

    const payload = await response.json().catch(() => null);
    if (response.ok && payload?.success === true) {
      const messageId = typeof payload.data?.messageId === "string" ? payload.data.messageId : null;
      logger.info("WhatsApp message sent", { to: maskNumber(recipient), messageId });
      return { messageId, to: recipient };
    }

    if (RETRYABLE_STATUS.has(response.status) && attempt < MAX_ATTEMPTS) {
      const retryAfter = Number(response.headers.get("retry-after"));
      await sleep(Number.isFinite(retryAfter) && retryAfter > 0 ? Math.min(retryAfter, 5) * 1000 : 600 * attempt);
      continue;
    }

    // WAAPI error bodies carry { success: false, error: "…" } — safe to log, never shown to customers.
    const failure = rejection("rejected message", response, payload);
    logger.error("WhatsApp send failed", { status: response.status, upstream: failure.internalMessage, to: maskNumber(recipient), attempt });
    throw failure;
  }
}

/**
 * Check the WAAPI key + session without sending a message (free endpoint).
 * @returns {Promise<{ status: string, connected: boolean, phone: string|null }>}  phone is masked
 */
export async function getWhatsAppSessionStatus() {
  const config = await requireConfig();
  const endpoint = endpointOf(config.baseUrl, servicesConfig.whatsapp.sessionStatusPath);
  endpoint.searchParams.set("sessionId", config.sessionId);
  let response;
  try {
    response = await fetch(endpoint, {
      headers: { Authorization: `Bearer ${config.apiKey}`, Accept: "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(servicesConfig.whatsapp.timeoutMs),
    });
  } catch (error) {
    throw new ExternalServiceError("whatsapp", `WAAPI ${error?.name === "TimeoutError" ? "request timed out" : "network error"}`, { cause: error });
  }
  const payload = await response.json().catch(() => null);
  if (!response.ok || payload?.success !== true) throw rejection("session check failed", response, payload);
  const status = String(payload.data?.status ?? "UNKNOWN").slice(0, 40);
  const phone = toPhoneDigits(payload.data?.phone);
  return { status, connected: status === "CONNECTED", phone: phone ? maskNumber(phone) : null };
}
