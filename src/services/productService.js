// Product, variant, image and inventory data access (server-only).
import "server-only";
import { getDb, withTransaction } from "../lib/db.js";
import { ConflictError, NotFoundError, ValidationError } from "../lib/errors.js";
import { localize, translationsFor } from "../i18n/content.js";
import { sortSizes } from "../lib/catalog/sizes.js";
import { DEFAULT_LOCALE } from "../i18n/config.js";
import { validate } from "../lib/validation/index.js";
import {
  imageAltSchema,
  productFlagsSchema,
  productImageInputSchema,
  productInputSchema,
  productStatusSchema,
  variantInputSchema,
  variantKey,
} from "../lib/validation/schemas/catalog.js";
import { idSchema } from "../lib/validation/schemas/common.js";
import { resolveUnitPrice } from "../lib/currency/pricing.js";

/** The price actually charged — the single rule from src/lib/currency/pricing.js. */
const effectivePriceOf = ({ price, salePrice, onSale }) => resolveUnitPrice({ price, salePrice, onSale }).unitPrice;

const TRANSLATABLE = ["name", "shortDescription", "description"];
const IMAGE_ORDER = [{ isPrimary: "desc" }, { sortOrder: "asc" }, { createdAt: "asc" }];

const CATEGORY_SELECT = { select: { id: true, name: true, slug: true, parent: { select: { name: true, slug: true } } } };

/** Storefront: category + parent with the visitor's translation row (names shown on cards, breadcrumbs). */
const categorySelect = (locale) => {
  const translations = translationsFor(locale);
  if (!translations) return CATEGORY_SELECT;
  return { select: { id: true, name: true, slug: true, translations, parent: { select: { name: true, slug: true, translations } } } };
};

/** Overlay the locale's product + category translations onto a storefront record. */
function localizeProduct(record, locale) {
  const product = localize(record, locale, TRANSLATABLE);
  if (!product?.category?.translations) return product;
  const category = localize(product.category, locale, ["name"]);
  return { ...product, category: { ...category, parent: category.parent ? localize(category.parent, locale, ["name"]) : null } };
}

/** Listing pages: only what a product card renders (2 images, no variants). */
const listInclude = (locale) => {
  const translations = translationsFor(locale);
  return { category: categorySelect(locale), images: { orderBy: IMAGE_ORDER, take: 2 }, ...(translations && { translations }) };
};

/** Product page: every image (in admin-defined order) and all variants. */
const detailInclude = (locale) => {
  const translations = translationsFor(locale);
  return {
    category: categorySelect(locale),
    images: { orderBy: IMAGE_ORDER },
    variants: { orderBy: [{ color: "asc" }, { createdAt: "asc" }] },
    ...(translations && { translations }),
  };
};

// ─── Storefront queries: filters, sorting, facets ────────────────────────────

/** Server-side sort options. "bestSelling" ranks by real (non-cancelled) order quantities only. */
export const PRODUCT_SORTS = ["featured", "newest", "bestSelling", "priceAsc", "priceDesc", "name"];

const ORDER_BY = {
  featured: [{ featured: "desc" }, { createdAt: "desc" }],
  newest: [{ createdAt: "desc" }],
  priceAsc: [{ effectivePrice: "asc" }, { createdAt: "desc" }],
  priceDesc: [{ effectivePrice: "desc" }, { createdAt: "desc" }],
  name: [{ name: "asc" }],
};

const FLAG_FIELDS = ["newArrival", "bestSeller", "onSale", "featured"];

/**
 * Translate a storefront filter into a Prisma `where`. Every condition is ANDed,
 * always restricted to PUBLISHED products in ACTIVE categories.
 *
 * @param {{
 *   categories?: string[],     // collection context: category OR its parent matches (department/subcategory slugs)
 *   subcategories?: string[],  // user-selected subcategory slugs (OR within)
 *   gender?: string[], flag?: string, flags?: string[],
 *   popular?: boolean,         // best-seller flag OR real (non-cancelled) sales
 *   sizes?: string[], colors?: string[],  // matched on ONE in-stock variant
 *   materials?: string[], inStock?: boolean,
 *   priceMin?: string, priceMax?: string, // PKR on effectivePrice
 *   search?: string,
 *   base?: object,             // fixed collection scope (same shape), ANDed and never overridden or omitted by facets
 * }} filter
 */
export function buildProductWhere(filter = {}) {
  const and = [{ status: "PUBLISHED" }, { category: { status: "ACTIVE" } }];
  const inCategories = (slugs) => ({ OR: [{ category: { slug: { in: slugs } } }, { category: { parent: { slug: { in: slugs } } } }] });

  if (filter.base) and.push(buildProductWhere(filter.base));
  if (filter.categories?.length) and.push(inCategories(filter.categories));
  if (filter.subcategories?.length) and.push(inCategories(filter.subcategories));
  if (filter.gender?.length) and.push({ gender: { in: filter.gender } });
  if (filter.popular) and.push({ OR: [{ bestSeller: true }, { orderItems: { some: { order: { status: { not: "CANCELLED" } } } } }] });
  for (const flag of new Set([filter.flag, ...(filter.flags ?? [])].filter((value) => FLAG_FIELDS.includes(value)))) {
    and.push({ [flag]: true });
  }
  if (filter.sizes?.length || filter.colors?.length) {
    and.push({
      variants: {
        some: {
          stock: { gt: 0 },
          ...(filter.sizes?.length && { size: { in: filter.sizes } }),
          ...(filter.colors?.length && { color: { in: filter.colors } }),
        },
      },
    });
  }
  if (filter.materials?.length) and.push({ material: { in: filter.materials } });
  if (filter.inStock) and.push({ stock: { gt: 0 } });
  if (filter.priceMin || filter.priceMax) {
    and.push({ effectivePrice: { ...(filter.priceMin && { gte: filter.priceMin }), ...(filter.priceMax && { lte: filter.priceMax }) } });
  }
  if (filter.search) {
    // Each word must match somewhere (name, SKUs, material, category). Case-insensitive via utf8mb4_unicode_ci.
    for (const term of filter.search.trim().split(/\s+/).filter(Boolean).slice(0, 6)) {
      and.push({
        OR: [
          { name: { contains: term } },
          { sku: { contains: term } },
          { variants: { some: { sku: { contains: term } } } },
          { material: { contains: term } },
          { shortDescription: { contains: term } },
          { category: { name: { contains: term } } },
          { category: { parent: { name: { contains: term } } } },
        ],
      });
    }
  }
  return { AND: and };
}

/** Units sold per product (orders not cancelled). Empty when there are no sales yet. */
async function salesByProduct(where) {
  const rows = await getDb().orderItem.groupBy({
    by: ["productId"],
    where: { productId: { not: null }, order: { status: { not: "CANCELLED" } }, ...(where && { product: where }) },
    _sum: { quantity: true },
  });
  return new Map(rows.map((row) => [row.productId, row._sum.quantity ?? 0]));
}

/** True once real (non-cancelled) sales exist — the storefront only offers "Best selling" then. */
export async function hasSalesData() {
  const count = await getDb().orderItem.count({ where: { productId: { not: null }, order: { status: { not: "CANCELLED" } } } });
  return count > 0;
}

async function findByIds(ids, locale) {
  if (!ids.length) return [];
  const records = await getDb().product.findMany({ where: { id: { in: ids } }, include: listInclude(locale) });
  const byId = new Map(records.map((record) => [record.id, record]));
  return ids.map((id) => byId.get(id)).filter(Boolean);
}

export async function listPublishedProducts({ filter, sort = "newest", take = 24, skip = 0, locale = DEFAULT_LOCALE } = {}) {
  if (sort === "bestSelling") return (await paginatePublishedProducts({ filter, sort, page: 1, pageSize: take, locale })).items;
  const records = await getDb().product.findMany({
    where: buildProductWhere(filter),
    orderBy: ORDER_BY[sort] ?? ORDER_BY.newest,
    take,
    skip,
    include: listInclude(locale),
  });
  return records.map((record) => localizeProduct(record, locale));
}

export async function countPublishedProducts(filter) {
  return getDb().product.count({ where: buildProductWhere(filter) });
}

/** Paginated, filtered, sorted listing for collection & search pages. */
export async function paginatePublishedProducts({ filter, sort = "featured", page = 1, pageSize = 24, locale = DEFAULT_LOCALE } = {}) {
  const where = buildProductWhere(filter);
  const total = await getDb().product.count({ where });
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(Math.max(1, Math.floor(page)), pageCount);
  const skip = (safePage - 1) * pageSize;

  let items;
  if (sort === "bestSelling") {
    // Rank by real units sold; products without sales follow, newest first.
    const [sales, all] = await Promise.all([
      salesByProduct(where),
      getDb().product.findMany({ where, select: { id: true }, orderBy: ORDER_BY.newest }),
    ]);
    const ranked = all.map((row, index) => ({ id: row.id, sold: sales.get(row.id) ?? 0, index })).sort((a, b) => b.sold - a.sold || a.index - b.index);
    items = await findByIds(ranked.slice(skip, skip + pageSize).map((row) => row.id), locale);
  } else {
    items = await getDb().product.findMany({ where, orderBy: ORDER_BY[sort] ?? ORDER_BY.featured, take: pageSize, skip, include: listInclude(locale) });
  }

  return { items: items.map((record) => localizeProduct(record, locale)), total, page: safePage, pageSize, pageCount };
}

const omit = (filter, ...keys) => Object.fromEntries(Object.entries(filter).filter(([key]) => !keys.includes(key)));

/**
 * Facet values within the current result context. Each facet is computed with all
 * active filters EXCEPT its own, so multi-select never leads to dead ends.
 * @param {object} filter  the full active filter (see buildProductWhere)
 * @param {{ parentCategoryId?: string, locale?: string }} options  department whose subcategories are offered
 */
export async function getFilterFacets(filter = {}, { parentCategoryId, locale = DEFAULT_LOCALE } = {}) {
  const db = getDb();
  const variantWhere = (key) => ({ stock: { gt: 0 }, product: buildProductWhere(omit(filter, key)) });

  const [sizeRows, colorRows, materialRows, priceAgg, genderRows, subcategoryRows, flagCounts, inStockCount] = await Promise.all([
    db.productVariant.findMany({ where: { ...variantWhere("sizes"), size: { not: null }, ...(filter.colors?.length && { color: { in: filter.colors } }) }, select: { size: true }, distinct: ["size"] }),
    db.productVariant.findMany({ where: { ...variantWhere("colors"), color: { not: null }, ...(filter.sizes?.length && { size: { in: filter.sizes } }) }, select: { color: true, colorHex: true }, distinct: ["color"] }),
    db.product.findMany({ where: { AND: [buildProductWhere(omit(filter, "materials")), { material: { not: null } }] }, select: { material: true }, distinct: ["material"], orderBy: { material: "asc" } }),
    db.product.aggregate({ where: buildProductWhere(omit(filter, "priceMin", "priceMax")), _min: { effectivePrice: true }, _max: { effectivePrice: true } }),
    db.product.groupBy({ by: ["gender"], where: buildProductWhere(omit(filter, "gender")), _count: { _all: true } }),
    parentCategoryId
      ? db.product.groupBy({ by: ["categoryId"], where: buildProductWhere(omit(filter, "subcategories")), _count: { _all: true } })
      : Promise.resolve([]),
    Promise.all(FLAG_FIELDS.map((flag) => db.product.count({ where: buildProductWhere({ ...filter, flags: [...new Set([...(filter.flags ?? []), flag])] }) }))),
    db.product.count({ where: buildProductWhere({ ...filter, inStock: true }) }),
  ]);

  let subcategories = [];
  if (parentCategoryId) {
    const counts = new Map(subcategoryRows.map((row) => [row.categoryId, row._count._all]));
    const translations = translationsFor(locale);
    const children = await db.category.findMany({
      where: { parentId: parentCategoryId, status: "ACTIVE" },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: { id: true, name: true, slug: true, ...(translations && { translations }) },
    });
    subcategories = children
      .map((child) => ({ ...localize(child, locale, ["name"]), count: counts.get(child.id) ?? 0 }))
      .map(({ slug, name, count }) => ({ slug, name, count }));
  }

  return {
    sizes: sortSizes(sizeRows.map((row) => row.size)),
    colors: colorRows.map((row) => ({ name: row.color, hex: row.colorHex })),
    materials: materialRows.map((row) => row.material),
    price: { min: priceAgg._min.effectivePrice?.toString() ?? null, max: priceAgg._max.effectivePrice?.toString() ?? null },
    genders: genderRows.map((row) => ({ value: row.gender, count: row._count._all })),
    subcategories,
    flags: Object.fromEntries(FLAG_FIELDS.map((flag, index) => [flag, flagCounts[index]])),
    inStock: inStockCount,
  };
}

export async function getPublishedProductBySlug(slug, { locale = DEFAULT_LOCALE } = {}) {
  const record = await getDb().product.findFirst({
    where: { slug, status: "PUBLISHED", category: { status: "ACTIVE" } },
    include: detailInclude(locale),
  });
  return record ? localizeProduct(record, locale) : null;
}

export async function listPublishedSlugs({ take = 5000 } = {}) {
  return getDb().product.findMany({ where: buildProductWhere(), select: { slug: true, updatedAt: true }, take });
}

// ─── Admin reads ─────────────────────────────────────────────────────────────

/** Admin product table: search, status/category filters, pagination. Includes every status. */
export async function listAdminProducts({ q, status, categoryId, page = 1, pageSize = 20 } = {}) {
  const where = {
    ...(status && { status }),
    ...(categoryId && { OR: [{ categoryId }, { category: { parentId: categoryId } }] }),
    ...(q && {
      AND: q
        .trim()
        .split(/\s+/)
        .slice(0, 5)
        .map((term) => ({ OR: [{ name: { contains: term } }, { slug: { contains: term } }, { sku: { contains: term } }, { variants: { some: { sku: { contains: term } } } }] })),
    }),
  };
  const db = getDb();
  const [items, total, counts] = await Promise.all([
    db.product.findMany({
      where,
      orderBy: [{ updatedAt: "desc" }],
      take: pageSize,
      skip: (Math.max(1, page) - 1) * pageSize,
      include: {
        category: CATEGORY_SELECT,
        images: { orderBy: IMAGE_ORDER, take: 1 },
        _count: { select: { variants: true, images: true, orderItems: true } },
      },
    }),
    db.product.count({ where }),
    db.product.groupBy({ by: ["status"], _count: { _all: true } }),
  ]);
  return {
    items,
    total,
    page: Math.max(1, page),
    pageCount: Math.max(1, Math.ceil(total / pageSize)),
    statusCounts: Object.fromEntries(counts.map((row) => [row.status, row._count._all])),
  };
}

export async function getAdminProduct(id) {
  const product = await getDb().product.findUnique({
    where: { id: validate(idSchema, id) },
    include: {
      category: CATEGORY_SELECT,
      images: { orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] },
      variants: { orderBy: [{ createdAt: "asc" }] },
      _count: { select: { orderItems: true } },
    },
  });
  if (!product) throw new NotFoundError("Product not found.");
  return product;
}

// ─── Admin writes ────────────────────────────────────────────────────────────

/** Recompute the denormalised Product.stock from its variants (call inside the same transaction). */
export async function recalculateProductStock(tx, productId) {
  const { _sum } = await tx.productVariant.aggregate({ where: { productId }, _sum: { stock: true } });
  await tx.product.update({ where: { id: productId }, data: { stock: _sum.stock ?? 0 } });
}

function conflictMessage(error) {
  const target = String(error?.meta?.target ?? error?.message ?? "");
  if (/slug/i.test(target)) return { slug: ["This slug is already used by another product."] };
  if (/sku/i.test(target)) return { sku: ["A product or variant SKU is already in use."] };
  return { _form: ["This product conflicts with existing data."] };
}

async function assertCategory(tx, categoryId) {
  const category = await tx.category.findUnique({ where: { id: categoryId }, select: { id: true } });
  if (!category) throw new ValidationError(undefined, { categoryId: ["Category not found."] });
}

/** Create a product with its variants atomically. Images are attached after upload. */
export async function createProduct(input) {
  const { variants, ...product } = validate(productInputSchema, input);
  try {
    return await withTransaction(async (tx) => {
      await assertCategory(tx, product.categoryId);
      return tx.product.create({
        data: {
          ...product,
          effectivePrice: effectivePriceOf(product),
          stock: variants.reduce((sum, variant) => sum + variant.stock, 0),
          variants: { create: variants.map(({ id: _id, ...variant }) => variant) },
        },
        include: { variants: true },
      });
    });
  } catch (error) {
    if (error?.code === "P2002") throw new ValidationError("Please fix the highlighted fields.", conflictMessage(error));
    throw error;
  }
}

/**
 * Update a product and synchronise its variants in one transaction:
 * variants with an `id` are updated, new ones created, missing ones deleted
 * (order history keeps its snapshots; cart/saved rows for them are removed).
 */
export async function updateProduct(id, input) {
  const productId = validate(idSchema, id);
  const { variants, ...product } = validate(productInputSchema, input);

  try {
    return await withTransaction(async (tx) => {
      const existing = await tx.product.findUnique({ where: { id: productId }, include: { variants: { select: { id: true } } } });
      if (!existing) throw new NotFoundError("Product not found.");
      await assertCategory(tx, product.categoryId);

      const existingIds = new Set(existing.variants.map((variant) => variant.id));
      const keepIds = new Set(variants.filter((variant) => variant.id && existingIds.has(variant.id)).map((variant) => variant.id));

      // Delete removed variants first so their size/colour/SKU can be reused by new rows.
      await tx.productVariant.deleteMany({ where: { productId, id: { notIn: [...keepIds] } } });
      for (const { id: variantId, ...data } of variants) {
        if (variantId && keepIds.has(variantId)) await tx.productVariant.update({ where: { id: variantId }, data });
      }
      for (const { id: variantId, ...data } of variants) {
        if (!variantId || !keepIds.has(variantId)) await tx.productVariant.create({ data: { ...data, productId } });
      }

      await tx.product.update({ where: { id: productId }, data: { ...product, effectivePrice: effectivePriceOf(product) } });
      await recalculateProductStock(tx, productId);
      return tx.product.findUnique({ where: { id: productId }, include: { variants: true } });
    });
  } catch (error) {
    if (error?.code === "P2002") throw new ValidationError("Please fix the highlighted fields.", conflictMessage(error));
    throw error;
  }
}

/** Current status of a product (for status-transition rules), or throws NotFoundError. */
export async function getProductStatus(id) {
  const product = await getDb().product.findUnique({ where: { id: validate(idSchema, id) }, select: { status: true } });
  if (!product) throw new NotFoundError("Product not found.");
  return product.status;
}

export async function setProductStatus(id, status) {
  return getDb().product.update({
    where: { id: validate(idSchema, id) },
    data: { status: validate(productStatusSchema, status) },
    select: { id: true, status: true },
  });
}

export async function setProductFlags(id, flags) {
  const data = validate(productFlagsSchema, flags);
  const productId = validate(idSchema, id);
  const product = await getDb().product.findUnique({ where: { id: productId }, select: { price: true, salePrice: true, onSale: true } });
  if (!product) throw new NotFoundError("Product not found.");
  if (data.onSale && !product.salePrice) throw new ValidationError("Set a sale price before marking the product on sale.");
  const onSale = data.onSale ?? product.onSale;
  return getDb().product.update({
    where: { id: productId },
    data: { ...data, effectivePrice: effectivePriceOf({ ...product, onSale }) },
    select: { id: true, featured: true, newArrival: true, bestSeller: true, onSale: true },
  });
}

/**
 * Permanently delete a product — only when no order references it (otherwise
 * archive it). Returns the Cloudinary public ids the caller must delete AFTER commit.
 */
export async function deleteProductSafely(id) {
  const productId = validate(idSchema, id);
  return withTransaction(async (tx) => {
    const product = await tx.product.findUnique({
      where: { id: productId },
      select: { id: true, images: { select: { publicId: true } }, _count: { select: { orderItems: true } } },
    });
    if (!product) throw new NotFoundError("Product not found.");
    if (product._count.orderItems > 0) {
      throw new ConflictError("This product appears in orders, so it cannot be deleted. Archive it instead.");
    }
    await tx.product.delete({ where: { id: productId } });
    return { publicIds: product.images.map((image) => image.publicId) };
  });
}

/** Add a variant, rejecting combinations that already exist (NULL size/colour treated as equal). */
export async function addVariant(productId, input) {
  const data = validate(variantInputSchema, input);
  return withTransaction(async (tx) => {
    const existing = await tx.productVariant.findMany({ where: { productId }, select: { size: true, color: true } });
    if (existing.some((variant) => variantKey(variant) === variantKey(data))) {
      throw new ConflictError("This size/colour combination already exists for the product.");
    }
    const { id: _id, ...fields } = data;
    const variant = await tx.productVariant.create({ data: { ...fields, productId } });
    await recalculateProductStock(tx, productId);
    return variant;
  });
}

// ─── Images ──────────────────────────────────────────────────────────────────

/**
 * Persist an image that has ALREADY been uploaded to Cloudinary. Appended at the
 * end of the gallery; the first image of a product becomes primary.
 */
export async function addProductImage(productId, input) {
  const data = validate(productImageInputSchema, input);
  return withTransaction(async (tx) => {
    // Lock the product row: parallel uploads for the same product are serialised here,
    // so exactly one image becomes primary and sortOrder values never collide.
    const locked = await tx.$queryRaw`SELECT id FROM Product WHERE id = ${productId} FOR UPDATE`;
    if (!locked.length) throw new NotFoundError("Product not found.");
    const [count, last] = await Promise.all([
      tx.productImage.count({ where: { productId } }),
      tx.productImage.aggregate({ where: { productId }, _max: { sortOrder: true } }),
    ]);
    return tx.productImage.create({
      data: { ...data, productId, sortOrder: (last._max.sortOrder ?? -1) + 1, isPrimary: count === 0 },
    });
  });
}

/** Guarantee exactly one primary image per product. */
export async function setPrimaryImage(productId, imageId) {
  return withTransaction(async (tx) => {
    const image = await tx.productImage.findFirst({ where: { id: imageId, productId }, select: { id: true } });
    if (!image) throw new NotFoundError("Image not found for this product.");
    await tx.productImage.updateMany({ where: { productId, isPrimary: true }, data: { isPrimary: false } });
    return tx.productImage.update({ where: { id: imageId }, data: { isPrimary: true } });
  });
}

/** Persist a new gallery order. `orderedIds` must be exactly the product's image ids. */
export async function reorderProductImages(productId, orderedIds) {
  const ids = orderedIds.map((value) => validate(idSchema, value));
  return withTransaction(async (tx) => {
    const current = await tx.productImage.findMany({ where: { productId }, select: { id: true } });
    const known = new Set(current.map((image) => image.id));
    if (ids.length !== known.size || new Set(ids).size !== ids.length || !ids.every((value) => known.has(value))) {
      throw new ValidationError("The image list is out of date. Refresh and try again.");
    }
    for (const [index, imageId] of ids.entries()) {
      await tx.productImage.update({ where: { id: imageId }, data: { sortOrder: index } });
    }
  });
}

export async function updateImageAlt(productId, imageId, alt) {
  const { count } = await getDb().productImage.updateMany({ where: { id: imageId, productId }, data: { alt: validate(imageAltSchema, alt) } });
  if (!count) throw new NotFoundError("Image not found for this product.");
}

/**
 * Remove an image record; if it was primary, the next image becomes primary.
 * Returns the Cloudinary public id for the caller to delete AFTER commit.
 */
export async function deleteProductImage(productId, imageId) {
  return withTransaction(async (tx) => {
    const image = await tx.productImage.findFirst({ where: { id: imageId, productId } });
    if (!image) throw new NotFoundError("Image not found for this product.");
    await tx.productImage.delete({ where: { id: image.id } });
    if (image.isPrimary) {
      const next = await tx.productImage.findFirst({ where: { productId }, orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] });
      if (next) await tx.productImage.update({ where: { id: next.id }, data: { isPrimary: true } });
    }
    return { publicId: image.publicId };
  });
}

// ─── Inventory primitives (used inside order transactions) ───────────────────

/**
 * Atomically decrement stock only if enough is available — a single conditional
 * UPDATE, so concurrent checkouts cannot oversell. Must run inside `withTransaction`.
 */
export async function decrementVariantStock(tx, variantId, quantity) {
  const variant = await tx.productVariant.findUnique({ where: { id: variantId }, select: { productId: true } });
  if (!variant) throw new NotFoundError("Product variant not found.");

  const { count } = await tx.productVariant.updateMany({
    where: { id: variantId, stock: { gte: quantity } },
    data: { stock: { decrement: quantity } },
  });
  if (count === 0) throw new ConflictError("Not enough stock for one of the items.");

  await tx.product.updateMany({
    where: { id: variant.productId, stock: { gte: quantity } },
    data: { stock: { decrement: quantity } },
  });
}

/** Return stock (cancellations / failed payments). Must run inside `withTransaction`. */
export async function restoreVariantStock(tx, variantId, quantity) {
  const variant = await tx.productVariant.update({
    where: { id: variantId },
    data: { stock: { increment: quantity } },
    select: { productId: true },
  });
  await tx.product.update({ where: { id: variant.productId }, data: { stock: { increment: quantity } } });
}
