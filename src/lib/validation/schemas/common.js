// Reusable field schemas shared by forms and API payloads.
import { z } from "zod";

export const idSchema = z.string().trim().min(1).max(64).regex(/^[a-z0-9]+$/i, "Invalid identifier.");

export const emailSchema = z
  .email({ error: "Please enter a valid email address." })
  .trim()
  .toLowerCase()
  .max(191);

export const personNameSchema = z
  .string({ error: "This field is required." })
  .trim()
  .min(1, { error: "This field is required." })
  .max(80, { error: "Must be 80 characters or fewer." });

/**
 * International phone number. Normalised to digits only with country code
 * (e.g. 923001234567), which is also the format the WhatsApp API expects.
 */
export const phoneSchema = z
  .string()
  .trim()
  .transform((value) => value.replace(/[\s()+-]/g, ""))
  .pipe(z.string().regex(/^\d{8,15}$/, { error: "Enter a valid phone number including country code." }));

export const slugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(1)
  .max(160)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, { error: "Use lowercase letters, numbers and hyphens only." });

/**
 * Non-negative PKR amount with at most two decimal places, fitting DECIMAL(12,2).
 * Validated as a string (no float rounding) and returned normalised ("1500" → "1500.00")
 * for Prisma Decimal. Numbers are accepted only if they are already safe integers/2dp.
 */
export const moneySchema = z
  .union([z.string(), z.number()])
  .transform((value) => String(value).trim())
  .pipe(z.string().regex(/^\d{1,10}(\.\d{1,2})?$/, { error: "Enter a valid amount (max two decimal places)." }))
  .transform((value) => {
    const [whole, fraction = ""] = value.split(".");
    return `${BigInt(whole)}.${(fraction + "00").slice(0, 2)}`;
  });

/** Positive whole quantity (cart, saved items, order lines). */
export const quantitySchema = z.coerce
  .number({ error: "Enter a quantity." })
  .int({ error: "Quantity must be a whole number." })
  .min(1, { error: "Quantity must be at least 1." })
  .max(99, { error: "Quantity is too large." });

/** Stock level: whole, never negative, fits UNSIGNED INT. */
export const stockSchema = z.coerce.number().int().min(0, { error: "Stock cannot be negative." }).max(1_000_000);

/** SKU: letters, numbers and dashes, stored upper-case. */
export const skuSchema = z
  .string()
  .trim()
  .toUpperCase()
  .min(2)
  .max(64)
  .regex(/^[A-Z0-9][A-Z0-9-]*$/, { error: "Use letters, numbers and dashes only." });

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(24),
});

/** Only allow internal, relative redirect targets (prevents open redirects). */
export const safeRedirectSchema = z
  .string()
  .trim()
  .optional()
  .transform((value) => (value && value.startsWith("/") && !value.startsWith("//") && !value.includes("\\") ? value : undefined));
