// Minimal structured server logger with secret redaction.
// Output is JSON in production (log-aggregator friendly) and readable in development.
import "server-only";

const SENSITIVE_KEY = /pass(word)?|secret|token|authorization|cookie|api[-_]?key|session[-_]?id|signature|credential/i;
const isProduction = process.env.NODE_ENV === "production";

function redact(value, depth = 0) {
  if (depth > 5 || value === null || typeof value !== "object") return value;
  if (value instanceof Error) return serializeError(value);
  if (Array.isArray(value)) return value.map((item) => redact(item, depth + 1));

  return Object.fromEntries(
    Object.entries(value).map(([key, val]) => [key, SENSITIVE_KEY.test(key) ? "[REDACTED]" : redact(val, depth + 1)]),
  );
}

function serializeError(error) {
  return {
    name: error.name,
    message: error.internalMessage ? `${error.message} (${error.internalMessage})` : error.message,
    code: error.code,
    ...(error.service && { service: error.service }),
    ...(error.upstreamStatus && { upstreamStatus: error.upstreamStatus }),
    ...(error.stack && { stack: error.stack }),
    ...(error.cause && { cause: serializeError(error.cause instanceof Error ? error.cause : new Error(String(error.cause))) }),
  };
}

function write(level, message, context) {
  const entry = { level, time: new Date().toISOString(), message, ...(context && redact(context)) };

  if (isProduction) {
    (level === "error" ? console.error : console.log)(JSON.stringify(entry));
    return;
  }

  const method = level === "error" ? console.error : level === "warn" ? console.warn : console.log;
  method(`[${level}] ${message}`, context ? redact(context) : "");
}

export const logger = {
  debug: (message, context) => !isProduction && write("debug", message, context),
  info: (message, context) => write("info", message, context),
  warn: (message, context) => write("warn", message, context),
  error: (message, context) => write("error", message, context),
};
