// Server-only, validated access to secrets.
// (WhatsApp, SMTP and business contact settings live in src/lib/settings: they can
// be managed from /admin/settings, with these environment variables as fallback.)
//
// Each integration validates only its own variables, lazily, the first time it
// is used — so a missing SMTP password does not stop the storefront booting,
// but the email service fails loudly and safely. Error messages list variable
// NAMES only, never values.
import "server-only";
import { z } from "zod";
import { ConfigurationError } from "./errors.js";

const nonEmpty = z.string({ error: "is not set" }).trim().min(1, { error: "is not set" });

const schemas = {
  database: z.object({
    DATABASE_URL: nonEmpty.regex(/^(mysql|mariadb):\/\//, { error: "must start with mysql:// or mariadb://" }),
    DATABASE_CONNECTION_LIMIT: z.coerce.number().int().positive().default(10),
  }),
  auth: z.object({
    AUTH_SECRET: z.string({ error: "is not set" }).min(32, { error: "must be at least 32 characters" }),
  }),
  cloudinary: z.object({
    CLOUDINARY_CLOUD_NAME: nonEmpty,
    CLOUDINARY_API_KEY: nonEmpty,
    CLOUDINARY_API_SECRET: nonEmpty,
    CLOUDINARY_API_BASE_URL: z.url({ protocol: /^https$/, error: "must be an https:// URL" }).optional(),
  }),
  paynow: z.object({
    PAYNOW_API_BASE_URL: z.url({ error: "must be a URL" }),
    PAYNOW_API_KEY: nonEmpty,
    PAYNOW_SECRET: nonEmpty,
  }),
};

const cache = new Map();

// Accepted alternative names for existing variables (first non-empty value wins).
// SMTP / WhatsApp / contact variables are resolved by src/lib/settings, which
// lists their aliases in src/lib/settings/definitions.js.
const ALIASES = {};

/** Read a variable by its canonical name or an accepted alias ("" counts as unset). */
export function readEnv(name) {
  for (const key of [name, ...(ALIASES[name] ?? [])]) {
    const value = process.env[key];
    if (value !== undefined && value !== "") return value;
  }
  return undefined;
}

function load(group) {
  if (cache.has(group)) return cache.get(group);

  const schema = schemas[group];
  const raw = Object.fromEntries(
    Object.keys(schema.shape).map((key) => [key, readEnv(key)]),
  );
  const result = schema.safeParse(raw);

  if (!result.success) {
    const problems = result.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`);
    throw new ConfigurationError(`Invalid or missing ${group} environment variables → ${problems.join("; ")}`);
  }

  cache.set(group, result.data);
  return result.data;
}

export const getDatabaseEnv = () => load("database");
export const getAuthEnv = () => load("auth");
export const getCloudinaryEnv = () => load("cloudinary");
export const getPaynowEnv = () => load("paynow");

/** Which integrations are configured — names only, safe for admin diagnostics. */
export function getConfigurationStatus() {
  return Object.fromEntries(
    Object.keys(schemas).map((group) => {
      try {
        load(group);
        return [group, { configured: true }];
      } catch (error) {
        return [group, { configured: false, problem: error.internalMessage }];
      }
    }),
  );
}
