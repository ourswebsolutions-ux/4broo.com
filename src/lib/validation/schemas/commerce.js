// Validation for cart, wishlist, saved items, addresses and order money.
import { z } from "zod";
import { emailSchema, idSchema, moneySchema, personNameSchema, phoneSchema, quantitySchema } from "./common.js";

export const cartItemInputSchema = z.object({
  variantId: idSchema,
  quantity: quantitySchema.default(1),
});

export const quantityUpdateSchema = z.object({
  itemId: idSchema,
  quantity: quantitySchema,
});

export const wishlistInputSchema = z.object({ productId: idSchema });

export const addressInputSchema = z.object({
  label: z.string().trim().max(40).optional().nullable().transform((value) => value || null),
  fullName: z.string().trim().min(2).max(160),
  phone: phoneSchema,
  addressLine: z.string().trim().min(5).max(255),
  city: z.string().trim().min(2).max(100),
  postalCode: z.string().trim().max(20).optional().nullable().transform((value) => value || null),
  country: z.string().trim().min(2).max(60).default("Pakistan"),
  isDefault: z.boolean().default(false),
});

/** Customer + delivery snapshot captured on an order (no CNIC or other unnecessary data). */
export const orderCustomerSchema = z.object({
  customerName: personNameSchema.pipe(z.string().max(160)),
  customerEmail: emailSchema,
  customerPhone: phoneSchema,
  whatsappNumber: phoneSchema.optional().nullable().transform((value) => value ?? null),
  address: z.string().trim().min(5).max(500),
  city: z.string().trim().min(2).max(100),
  postalCode: z.string().trim().max(20).optional().nullable().transform((value) => value || null),
  country: z.string().trim().min(2).max(60).default("Pakistan"),
  customerNote: z.string().trim().max(1000).optional().nullable().transform((value) => value || null),
});

export const orderAmountsSchema = z.object({
  discount: moneySchema.default("0.00"),
  deliveryFee: moneySchema.default("0.00"),
});

export const ORDER_STATUSES = ["NEW", "CONFIRMED", "PROCESSING", "PACKED", "SHIPPED", "DELIVERED", "CANCELLED"];
export const PAYMENT_METHODS = ["COD", "PAYNOW"];

const blank = (value) => (typeof value === "string" && value.trim() === "" ? null : value);
const checkbox = z.preprocess((value) => value === true || value === "on" || value === "true", z.boolean());

/**
 * Checkout form. Delivery comes either from a saved address (`addressId`, re-read
 * from the customer's own address book) or from the new-address fields. Money is
 * never part of this payload — totals are computed on the server.
 */
export const checkoutSchema = z
  .object({
    idempotencyKey: z.uuid(),
    fullName: personNameSchema.pipe(z.string().min(2).max(160)),
    email: emailSchema,
    phone: phoneSchema,
    whatsappNumber: z.preprocess(blank, phoneSchema.nullable()).default(null),
    addressId: z.preprocess(blank, idSchema.nullable()).default(null),
    addressLine: z.preprocess(blank, z.string().trim().min(5).max(255).nullable()).default(null),
    city: z.preprocess(blank, z.string().trim().min(2).max(100).nullable()).default(null),
    postalCode: z.preprocess(blank, z.string().trim().max(20).nullable()).default(null),
    country: z.preprocess(blank, z.string().trim().min(2).max(60).nullable()).default(null),
    saveAddress: checkbox.default(false),
    deliveryMethod: z.enum(["STANDARD"]).default("STANDARD"),
    paymentMethod: z.enum(PAYMENT_METHODS),
    displayCurrency: z.enum(["PKR", "USD"]).default("PKR"),
    customerNote: z.preprocess(blank, z.string().trim().max(1000).nullable()).default(null),
  })
  .superRefine((data, ctx) => {
    if (data.addressId) return;
    for (const field of ["addressLine", "city", "country"]) {
      if (!data[field]) ctx.addIssue({ code: "custom", path: [field], message: "Required." });
    }
  });

/** Public order tracking: order number + the email used on the order. */
export const trackOrderSchema = z.object({
  orderNumber: z.string().trim().toUpperCase().regex(/^4B(RO)?-\d{6,8}-[0-9A-Z]{5,6}$/, { error: "Enter a valid order number." }),
  email: emailSchema,
});
