// Authenticated encryption for credentials stored in the database (AES-256-GCM).
//
// - Key: SETTINGS_ENCRYPTION_KEY — 32 random bytes as base64 or 64 hex characters
//   (generate with `openssl rand -base64 32`). It is never stored in the database.
// - Every value gets a fresh random 96-bit IV; the 128-bit auth tag detects tampering.
// - The setting key is bound as additional authenticated data, so a ciphertext copied
//   onto another setting's row fails to decrypt.
// - Rotation: move the old key to SETTINGS_ENCRYPTION_KEY_PREVIOUS and set a new
//   SETTINGS_ENCRYPTION_KEY. Values still decrypt with the previous key (matched by
//   keyId) and are re-encrypted with the new key the next time they are saved.
import "server-only";
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { ConfigurationError } from "../errors.js";

const ALGORITHM = "aes-256-gcm";
const IV_BYTES = 12;

function parseKey(raw) {
  const value = String(raw ?? "").trim();
  if (!value) return null;
  const bytes = /^[0-9a-f]{64}$/i.test(value) ? Buffer.from(value, "hex") : Buffer.from(value, "base64");
  return bytes.length === 32 ? bytes : "invalid";
}

/** Short fingerprint of a key (a hash prefix, not the key) to match ciphertexts to keys. */
const fingerprint = (key) => createHash("sha256").update(key).digest("hex").slice(0, 16);

function keys() {
  const current = parseKey(process.env.SETTINGS_ENCRYPTION_KEY);
  const previous = parseKey(process.env.SETTINGS_ENCRYPTION_KEY_PREVIOUS);
  return { current, previous };
}

/** Whether credentials can be encrypted (and a reason when not) — names only, never values. */
export function getEncryptionStatus() {
  const { current } = keys();
  if (current === null) return { configured: false, problem: "SETTINGS_ENCRYPTION_KEY is not set" };
  if (current === "invalid") return { configured: false, problem: "SETTINGS_ENCRYPTION_KEY must be 32 bytes (base64 or 64 hex characters)" };
  return { configured: true };
}

function currentKey() {
  const status = getEncryptionStatus();
  if (!status.configured) throw new ConfigurationError(status.problem);
  return keys().current;
}

/**
 * Encrypt a secret for storage under `settingKey`.
 * @returns {{ ciphertext: string, iv: string, authTag: string, keyId: string }}
 */
export function encryptSecret(plaintext, settingKey) {
  const key = currentKey();
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  cipher.setAAD(Buffer.from(settingKey, "utf8"));
  const ciphertext = Buffer.concat([cipher.update(String(plaintext), "utf8"), cipher.final()]);
  return {
    ciphertext: ciphertext.toString("base64"),
    iv: iv.toString("base64"),
    authTag: cipher.getAuthTag().toString("base64"),
    keyId: fingerprint(key),
  };
}

/** Decrypt a stored secret. Throws ConfigurationError when no matching key is available or the data was altered. */
export function decryptSecret({ ciphertext, iv, authTag, keyId }, settingKey) {
  const { current, previous } = keys();
  const candidate = [current, previous].find((key) => Buffer.isBuffer(key) && fingerprint(key) === keyId);
  if (!candidate) throw new ConfigurationError(`No encryption key matches the stored credential ${settingKey} (was SETTINGS_ENCRYPTION_KEY changed?)`);
  try {
    const decipher = createDecipheriv(ALGORITHM, candidate, Buffer.from(iv, "base64"));
    decipher.setAAD(Buffer.from(settingKey, "utf8"));
    decipher.setAuthTag(Buffer.from(authTag, "base64"));
    return Buffer.concat([decipher.update(Buffer.from(ciphertext, "base64")), decipher.final()]).toString("utf8");
  } catch {
    throw new ConfigurationError(`Stored credential ${settingKey} failed integrity verification`);
  }
}

/** Whether a stored credential was encrypted with the current key (false → re-save to rotate). */
export function isCurrentKey(keyId) {
  const { current } = keys();
  return Buffer.isBuffer(current) && fingerprint(current) === keyId;
}
