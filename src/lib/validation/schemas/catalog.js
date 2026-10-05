// Validation for catalogue writes (admin product/category management, imports).
import { z } from "zod";
import { compareMoney } from "../../currency/money.js";
import { idSchema, moneySchema, skuSchema, slugSchema, stockSchema } from "./common.js";

/** Treat "" (empty form field) as "not set". */
const blankToNull = (schema) => z.preprocess((value) => (value === "" || value === undefined ? null : value), schema.nullable());

const optionalText = (max) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .nullable()
    .transform((value) => value || null);

export const GENDERS = ["MEN", "WOMEN", "KIDS", "UNISEX"];
export const PRODUCT_STATUSES = ["DRAFT", "PUBLISHED", "ARCHIVED"];
export const CATEGORY_STATUSES = ["ACTIVE", "HIDDEN"];

export const categoryInputSchema = z.object({
  name: z.string().trim().min(1).max(120),
  slug: slugSchema,
  description: optionalText(5000),
  imageUrl: z.url().max(500).optional().nullable(),
  parentId: idSchema.optional().nullable().transform((value) => value || null),
  status: z.enum(CATEGORY_STATUSES).default("ACTIVE"),
  sortOrder: z.coerce.number().int().min(0).max(10_000).default(0),
});

export const variantInputSchema = z.object({
  /** Present when editing an existing variant. */
  id: idSchema.optional(),
  sku: skuSchema,
  size: optionalText(20),
  color: optionalText(40),
  colorHex: blankToNull(
    z
      .string()
      .trim()
      .regex(/^#[0-9A-Fa-f]{6}$/, { error: "Use a hex colour like #0B0B0A." })
      .transform((value) => value.toUpperCase()),
  ),
  priceOverride: blankToNull(moneySchema),
  stock: stockSchema.default(0),
});

const variantKey = (variant) => `${(variant.size ?? "").toLowerCase()}|${(variant.color ?? "").toLowerCase()}`;

export const productInputSchema = z
  .object({
    name: z.string().trim().min(1).max(191),
    slug: slugSchema,
    sku: blankToNull(skuSchema),
    shortDescription: optionalText(500),
    description: optionalText(20_000),
    material: optionalText(191),
    categoryId: idSchema,
    gender: z.enum(GENDERS).default("UNISEX"),
    status: z.enum(PRODUCT_STATUSES).default("DRAFT"),
    price: moneySchema,
    salePrice: blankToNull(moneySchema),
    featured: z.boolean().default(false),
    newArrival: z.boolean().default(false),
    bestSeller: z.boolean().default(false),
    onSale: z.boolean().default(false),
    seoTitle: optionalText(70),
    seoDescription: optionalText(170),
    variants: z.array(variantInputSchema).min(1, { error: "Add at least one variant." }).max(200),
  })
  .superRefine((product, ctx) => {
    if (product.salePrice !== null && compareMoney(product.salePrice, product.price) >= 0) {
      ctx.addIssue({ code: "custom", path: ["salePrice"], message: "Sale price must be lower than the regular price." });
    }
    if (product.onSale && product.salePrice === null) {
      ctx.addIssue({ code: "custom", path: ["salePrice"], message: "Set a sale price to mark the product on sale." });
    }

    // Variant combinations: NULLs are treated as equal here (the DB unique index cannot do this).
    const seenCombos = new Set();
    const seenSkus = new Set();
    product.variants.forEach((variant, index) => {
      const key = variantKey(variant);
      if (seenCombos.has(key)) {
        ctx.addIssue({ code: "custom", path: ["variants", index], message: "Duplicate size/colour combination." });
      }
      if (seenSkus.has(variant.sku)) {
        ctx.addIssue({ code: "custom", path: ["variants", index, "sku"], message: "Duplicate variant SKU." });
      }
      seenCombos.add(key);
      seenSkus.add(variant.sku);
    });
  });

/** Status / flag toggles from the admin list. */
export const productStatusSchema = z.enum(PRODUCT_STATUSES);
export const productFlagsSchema = z
  .object({
    featured: z.boolean(),
    newArrival: z.boolean(),
    bestSeller: z.boolean(),
    onSale: z.boolean(),
  })
  .partial();

export const productImageInputSchema = z.object({
  url: z.url().max(500).refine((value) => value.startsWith("https://"), { error: "Image URL must use HTTPS." }),
  publicId: z.string().trim().min(1).max(255),
  alt: optionalText(191),
  width: z.coerce.number().int().positive().max(20_000).optional().nullable(),
  height: z.coerce.number().int().positive().max(20_000).optional().nullable(),
  sortOrder: z.coerce.number().int().min(0).max(1000).default(0),
});

export const imageAltSchema = z.string().trim().max(191).transform((value) => value || null);

export const translationInputSchema = z.object({
  locale: z.enum(["ur", "hi"]),
  name: z.string().trim().min(1).max(191),
  shortDescription: optionalText(500),
  description: optionalText(20_000),
});

export { variantKey };
