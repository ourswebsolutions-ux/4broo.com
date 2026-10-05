// Non-secret server-side settings. Secrets live in environment variables (see src/lib/env.js).
import "server-only";

export const authConfig = {
  sessionCookieName: process.env.NODE_ENV === "production" ? "__Host-4bro_session" : "4bro_session",
  // Admin sessions are deliberately short-lived.
  sessionTtlMs: {
    CUSTOMER: 30 * 24 * 60 * 60 * 1000, // 30 days
    ADMIN: 12 * 60 * 60 * 1000, // 12 hours
  },
  passwordResetTtlMs: 60 * 60 * 1000, // 1 hour
  rateLimit: {
    login: { limit: 5, windowMs: 15 * 60 * 1000 },
    register: { limit: 5, windowMs: 60 * 60 * 1000 },
    passwordReset: { limit: 5, windowMs: 60 * 60 * 1000 },
  },
};

export const servicesConfig = {
  email: {
    senderName: "4 BRO",
    timeoutMs: 15_000,
  },
  whatsapp: {
    textMessagePath: "/api/v1/messages/text",
    sessionStatusPath: "/api/v1/session/status",
    timeoutMs: 15_000,
  },
  cloudinary: {
    folders: {
      products: "4bro/products",
      categories: "4bro/categories",
    },
    // Upper bound for a single uploaded image. Kept below the proxy's request-body
    // buffer (next.config.mjs → proxyClientMaxBodySize) so uploads are never truncated.
    maxUploadBytes: 8 * 1024 * 1024,
    allowedFormats: ["jpg", "jpeg", "png", "webp", "avif"],
    allowedMimeTypes: ["image/jpeg", "image/png", "image/webp", "image/avif"],
  },
  payment: {
    provider: "PAYNOW",
  },
};
