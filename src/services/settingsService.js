// Admin settings: saving overrides, credential replacement/removal, integration
// tests, audit trail and the admin view model. Server-only; callers authorise first.
//
// Storage rules
// - A SystemSetting row exists only for a value an admin saved that differs from the
//   environment/default. Saving a value equal to the fallback (or an empty value)
//   removes the override, so the environment configuration is never silently erased.
// - Credentials: an empty input keeps the stored credential. Replacing encrypts it
//   (AES-256-GCM) before anything is written — if encryption is unavailable nothing
//   changes. Removal is a separate, explicit action.
// - The admin view model never contains a credential value, only whether one is set
//   and where it comes from.
// - Audit rows record setting NAMES and safe outcomes, never values.
import "server-only";
import { getDb } from "../lib/db.js";
import { ConfigurationError, ValidationError, normalizeError } from "../lib/errors.js";
import { encryptSecret, getEncryptionStatus, isCurrentKey } from "../lib/security/encryption.js";
import { rateLimit } from "../lib/security/rate-limit.js";
import { getSettingsSnapshot, invalidateSettings, getSmtpConfig, getWhatsAppConfig } from "../lib/settings/index.js";
import { CATEGORIES, SETTINGS, SETTINGS_BY_KEY, parseSettingValue, settingsIn } from "../lib/settings/definitions.js";
import { sendEmail, verifyEmailTransport } from "../lib/services/email.js";
import { getWhatsAppSessionStatus, maskNumber, normalizeWhatsAppNumber, sendWhatsAppText } from "../lib/services/whatsapp.js";

const TEST_LIMIT = { limit: 5, windowMs: 10 * 60 * 1000 };

function categoryOf(name) {
  const category = CATEGORIES[name];
  if (!category) throw new ValidationError("Unknown settings section.");
  return category;
}

const formId = (key) => key.replace(".", "-");

const sameValue = (a, b) => JSON.stringify(a) === JSON.stringify(b);

/** What the setting falls back to without a database override. */
function fallbackOf(def, resolved) {
  if (resolved.envAvailable) return { value: fromEnvValue(def), from: "environment" };
  return { value: def.fallback ?? null, from: def.fallback !== undefined ? "default" : null };
}

/** Re-read the environment value (the snapshot's value may be the DB override). */
function fromEnvValue(def) {
  for (const name of def.env) {
    const raw = process.env[name];
    if (raw === undefined || raw === "") continue;
    const parsed = parseSettingValue(def, raw);
    return parsed.ok ? parsed.value : null;
  }
  return null;
}

async function audit(tx, { actorId, category, action, keys = [], success = null, outcome = null }) {
  await tx.settingAuditLog.create({
    data: {
      actorId,
      category,
      action,
      keys: keys.length ? keys.join(",").slice(0, 500) : null,
      success,
      outcome: outcome ? String(outcome).slice(0, 300) : null,
    },
  });
}

/**
 * Save one section. `values` holds non-secret fields (by setting key); `secrets`
 * holds credential replacements — an empty or missing entry keeps the stored credential.
 * @returns {{ updated: string[], replaced: string[] }}
 */
export async function saveSettings(sectionName, { values = {}, secrets = {} } = {}, actor) {
  const category = categoryOf(sectionName);
  const defs = settingsIn(category);
  const snapshot = await getSettingsSnapshot();
  if (snapshot.databaseProblem) throw new ConfigurationError("Settings table unavailable (run `npm run db:deploy`)");

  const fieldErrors = {};
  const writes = []; // { def, op: "upsert" | "delete", data? }

  for (const def of defs.filter((d) => !d.secret)) {
    if (!(def.key in values)) continue;
    const parsed = parseSettingValue(def, values[def.key]);
    if (!parsed.ok) {
      fieldErrors[formId(def.key)] = [parsed.message];
      continue;
    }
    const resolved = snapshot.fields[def.key];
    const fallback = fallbackOf(def, resolved);
    const storedValue = resolved.stored && !resolved.dbProblem && resolved.source === "database" ? resolved.value : undefined;
    if (parsed.value === null || sameValue(parsed.value, fallback.value)) {
      if (resolved.stored) writes.push({ def, op: "delete" });
    } else if (!sameValue(parsed.value, storedValue)) {
      writes.push({ def, op: "upsert", data: { value: JSON.stringify(parsed.value), ciphertext: null, iv: null, authTag: null, keyId: null } });
    }
  }

  const replaced = [];
  for (const def of defs.filter((d) => d.secret)) {
    const raw = secrets[def.key];
    if (raw === undefined || raw === null || String(raw).trim() === "") continue; // empty ⇒ keep existing
    const parsed = parseSettingValue(def, raw);
    if (!parsed.ok) {
      fieldErrors[formId(def.key)] = [parsed.message];
      continue;
    }
    replaced.push({ def, plaintext: parsed.value });
  }

  if (Object.keys(fieldErrors).length) throw new ValidationError("Please check the highlighted fields.", fieldErrors);

  // Encrypt everything first: if encryption is unavailable, nothing is written.
  if (replaced.length) {
    const status = getEncryptionStatus();
    if (!status.configured) {
      throw new ValidationError(
        "Credentials cannot be stored until SETTINGS_ENCRYPTION_KEY is configured on the server. Nothing was changed.",
        Object.fromEntries(replaced.map(({ def }) => [formId(def.key), ["Encryption key not configured — credential not saved."]])),
      );
    }
    for (const item of replaced) writes.push({ def: item.def, op: "upsert", secret: true, data: { value: null, ...encryptSecret(item.plaintext, item.def.key) } });
  }

  const updated = writes.filter((w) => !w.secret).map((w) => w.def.key);
  if (!writes.length) return { updated: [], replaced: [] };

  await getDb().$transaction(async (tx) => {
    for (const write of writes) {
      if (write.op === "delete") await tx.systemSetting.deleteMany({ where: { key: write.def.key } });
      else {
        const data = { ...write.data, category, updatedById: actor.id };
        await tx.systemSetting.upsert({ where: { key: write.def.key }, create: { key: write.def.key, ...data }, update: data });
      }
    }
    if (updated.length) {
      await audit(tx, {
        actorId: actor.id,
        category,
        action: category === "NOTIFICATIONS" ? "PREFERENCES_CHANGED" : "SETTINGS_UPDATED",
        keys: updated,
        success: true,
        outcome: `${updated.length} setting(s) updated`,
      });
    }
    for (const { def } of replaced) {
      await audit(tx, { actorId: actor.id, category, action: "CREDENTIAL_REPLACED", keys: [def.key], success: true, outcome: `${def.label} replaced (stored encrypted)` });
    }
  });
  invalidateSettings();
  return { updated, replaced: replaced.map(({ def }) => def.key) };
}

/** Remove a stored credential. The environment value (if any) applies again. */
export async function removeCredential(key, actor) {
  const def = SETTINGS_BY_KEY.get(key);
  if (!def?.secret) throw new ValidationError("Unknown credential.");
  const result = await getDb().$transaction(async (tx) => {
    const { count } = await tx.systemSetting.deleteMany({ where: { key } });
    if (count) {
      await audit(tx, {
        actorId: actor.id,
        category: def.category,
        action: "CREDENTIAL_REMOVED",
        keys: [key],
        success: true,
        outcome: `${def.label} removed from the database`,
      });
    }
    return count;
  });
  invalidateSettings();
  return { removed: result > 0 };
}

/** Remove every non-secret override in a section → environment/default values apply. */
export async function clearOverrides(sectionName, actor) {
  const category = categoryOf(sectionName);
  const keys = settingsIn(category)
    .filter((def) => !def.secret)
    .map((def) => def.key);
  const removed = await getDb().$transaction(async (tx) => {
    const existing = await tx.systemSetting.findMany({ where: { key: { in: keys } }, select: { key: true } });
    if (!existing.length) return [];
    await tx.systemSetting.deleteMany({ where: { key: { in: existing.map((row) => row.key) } } });
    await audit(tx, {
      actorId: actor.id,
      category,
      action: "OVERRIDES_CLEARED",
      keys: existing.map((row) => row.key),
      success: true,
      outcome: `${existing.length} override(s) cleared — environment values apply`,
    });
    return existing.map((row) => row.key);
  });
  invalidateSettings();
  return { removed };
}

/** Safe, short reason for a failed test (never credentials, headers or stacks). */
function safeReason(error) {
  const appError = normalizeError(error);
  const detail = appError.internalMessage ?? appError.message;
  return String(detail)
    .replace(/Bearer\s+\S+/gi, "Bearer [redacted]")
    .slice(0, 240);
}

async function runTest(category, kind, actor, task) {
  rateLimit(`settings-test:${actor.id}:${category}`, TEST_LIMIT);
  const testedAt = new Date();
  let result;
  try {
    result = { ok: true, message: await task() };
  } catch (error) {
    result = { ok: false, message: safeReason(error) };
  }
  await audit(getDb(), { actorId: actor.id, category, action: "INTEGRATION_TESTED", keys: [kind], success: result.ok, outcome: result.message });
  return { ...result, testedAt: testedAt.toISOString() };
}

/** WAAPI connection check (session status — nothing is sent). */
export function testWhatsAppConnection(actor) {
  return runTest("WHATSAPP", "connection", actor, async () => {
    const session = await getWhatsAppSessionStatus();
    if (!session.connected) throw new Error(`Session is ${session.status} — open WAAPI and reconnect the session (scan the QR code).`);
    return `Connected — session ${session.status}${session.phone ? ` on ${session.phone}` : ""}.`;
  });
}

/** Send a clearly labelled test message. Touches no order/payment data. */
export function sendWhatsAppTest(to, actor) {
  let recipient;
  try {
    recipient = normalizeWhatsAppNumber(to);
  } catch {
    throw new ValidationError("Enter a valid WhatsApp number.", { "whatsapp-testTo": ["Enter a valid number with country code, e.g. 923001234567."] });
  }
  return runTest("WHATSAPP", "message", actor, async () => {
    const { messageId } = await sendWhatsAppText({
      to: recipient,
      text: `*4 BRO — test message*\n\nThis is a test from the 4 BRO admin settings (${new Date().toUTCString()}). WhatsApp notifications are working. No action is needed.`,
    });
    return `Test message sent to ${maskNumber(recipient)}${messageId ? ` (id ${messageId.slice(0, 24)})` : ""}.`;
  });
}

/** Verify SMTP and, if a recipient is given, send a test email. */
export function testSmtp(to, actor) {
  const recipient = String(to ?? "").trim().toLowerCase();
  if (recipient && !parseSettingValue({ kind: "email" }, recipient).ok) {
    throw new ValidationError("Enter a valid email address.", { "smtp-testTo": ["Enter a valid email address."] });
  }
  return runTest("SMTP", recipient ? "email" : "connection", actor, async () => {
    await verifyEmailTransport();
    if (!recipient) return "SMTP connection and sign-in verified — nothing sent.";
    const { fromName, fromEmail } = await getSmtpConfig();
    await sendEmail({
      to: recipient,
      subject: "4 BRO — SMTP test",
      text: `This is a test email from the 4 BRO admin settings (${new Date().toUTCString()}).\n\nSender: ${fromName} <${fromEmail}>\nEmail notifications are configured correctly. No action is needed.`,
    });
    return `SMTP verified and a test email was sent to ${recipient}.`;
  });
}

const AUDIT_LABELS = {
  SETTINGS_UPDATED: "Settings updated",
  CREDENTIAL_REPLACED: "Credential replaced",
  CREDENTIAL_REMOVED: "Credential removed",
  PREFERENCES_CHANGED: "Preferences changed",
  OVERRIDES_CLEARED: "Overrides cleared",
  INTEGRATION_TESTED: "Integration tested",
};

async function lastTests() {
  const db = getDb();
  const latest = (category, where = {}) =>
    db.settingAuditLog.findFirst({ where: { category, action: "INTEGRATION_TESTED", ...where }, orderBy: { createdAt: "desc" }, select: { success: true, outcome: true, createdAt: true, keys: true } });
  const [wa, waOk, smtp, smtpOk] = await Promise.all([latest("WHATSAPP"), latest("WHATSAPP", { success: true }), latest("SMTP"), latest("SMTP", { success: true })]);
  const shape = (row) => (row ? { ok: row.success, message: row.outcome, kind: row.keys, at: row.createdAt.toISOString() } : null);
  return { WHATSAPP: { last: shape(wa), lastSuccessAt: waOk?.createdAt.toISOString() ?? null }, SMTP: { last: shape(smtp), lastSuccessAt: smtpOk?.createdAt.toISOString() ?? null } };
}

/**
 * Everything the settings page needs — no credential values, ever.
 * Non-secret values are included (they are shown in the form).
 */
export async function getSettingsOverview() {
  const snapshot = await getSettingsSnapshot();
  const encryption = getEncryptionStatus();
  const [whatsapp, smtp] = await Promise.all([getWhatsAppConfig(), getSmtpConfig()]);

  const fields = Object.fromEntries(
    SETTINGS.map((def) => {
      const r = snapshot.fields[def.key];
      const base = {
        key: def.key,
        label: def.label,
        source: r.source,
        stored: r.stored,
        envName: r.envName,
        envAvailable: r.envAvailable,
        problem: r.dbProblem ?? r.envProblem ?? null,
        storedAt: r.storedAt ? r.storedAt.toISOString() : null,
      };
      if (def.secret) return [def.key, { ...base, secret: true, configured: r.value != null, needsReencrypt: r.stored && !r.dbProblem && !isCurrentKey(r.storedKeyId) }];
      return [def.key, { ...base, value: r.value, fallback: def.fallback ?? null }];
    }),
  );

  let tests = { WHATSAPP: { last: null, lastSuccessAt: null }, SMTP: { last: null, lastSuccessAt: null } };
  let history = [];
  if (!snapshot.databaseProblem) {
    [tests, history] = await Promise.all([
      lastTests(),
      getDb().settingAuditLog.findMany({
        orderBy: { createdAt: "desc" },
        take: 12,
        select: { id: true, category: true, action: true, keys: true, success: true, outcome: true, createdAt: true, actor: { select: { firstName: true, lastName: true, email: true } } },
      }),
    ]);
  }

  return {
    fields,
    databaseProblem: snapshot.databaseProblem,
    encryption,
    status: {
      whatsapp: { configured: whatsapp.configured, missing: whatsapp.missing, enabled: whatsapp.enabled, ...tests.WHATSAPP },
      smtp: { configured: smtp.configured, missing: smtp.missing, enabled: smtp.enabled, ...tests.SMTP },
    },
    history: history.map((row) => ({
      id: row.id,
      category: row.category,
      action: AUDIT_LABELS[row.action] ?? row.action,
      keys: row.keys,
      success: row.success,
      outcome: row.outcome,
      at: row.createdAt.toISOString(),
      actor: row.actor ? `${row.actor.firstName} ${row.actor.lastName}`.trim() || row.actor.email : "Deleted user",
    })),
  };
}
