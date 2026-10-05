// Storefront catalogue read model — the ONLY module pages/APIs use to read products.
//
// Source: MySQL via src/services/*. Every function returns the shapes defined in
// ./mappers.js. An empty catalogue yields empty lists (pages show empty states) —
// no sample or placeholder products are ever served.
import "server-only";
import { cache } from "react";
import { getCollectionDefinition } from "@/content/collections";
import { DEFAULT_LOCALE } from "@/i18n/config";
import { getTranslator } from "@/i18n/server";
import { getExchangeRate } from "@/lib/currency/rates";
import { logger } from "@/lib/logger";
import { getCategoryBySlug, listCategoryTree } from "@/services/categoryService";
import { parseCatalogQuery } from "@/lib/catalog/query";
import {
  countPublishedProducts,
  getFilterFacets,
  getPublishedProductBySlug,
  hasSalesData,
  listPublishedProducts,
  paginatePublishedProducts,
} from "@/services/productService";
import { toProductCard, toProductDetail } from "./mappers";

export const PAGE_SIZE = 24;

/** USD display rate (decimal string) or null — resolved once per request. */
export const getUsdRate = cache(async () => (await getExchangeRate("PKR", "USD"))?.rate ?? null);

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function cards(records) {
  const usdRate = await getUsdRate();
  return records.map((record) => toProductCard(record, { usdRate }));
}

/** Listing sections degrade to an empty state (logged) instead of taking the page down. */
async function resilient(label, task, fallback = []) {
  try {
    return await task();
  } catch (error) {
    logger.error(`Catalogue read failed: ${label}`, { error });
    return fallback;
  }
}

async function query({ filter, take, locale, sort }) {
  return cards(await listPublishedProducts({ filter, take, locale, sort }));
}

// ─── Public API ──────────────────────────────────────────────────────────────

export const getNewArrivals = ({ limit = 8, locale = DEFAULT_LOCALE } = {}) =>
  resilient("new arrivals", () => query({ filter: { flag: "newArrival" }, take: limit, locale }));

/** Flagged best sellers and products with real sales, ranked by units sold. Empty until something sells. */
export const getBestSellers = ({ limit = 4, locale = DEFAULT_LOCALE } = {}) =>
  resilient("best sellers", () => query({ filter: { popular: true }, sort: "bestSelling", take: limit, locale }));

export const getFeaturedProducts = ({ limit = 4, locale = DEFAULT_LOCALE } = {}) =>
  resilient("featured", () => query({ filter: { flag: "featured" }, take: limit, locale }));

const EMPTY_FACETS = { sizes: [], colors: [], materials: [], price: { min: null, max: null }, genders: [], subcategories: [], flags: {}, inStock: 0 };

/** Listing core shared by collection and search pages: filter + sort + paginate + facets. */
async function runListing(label, { baseFilter, searchParams, locale, parentCategoryId }) {
  const usdRate = await getUsdRate();
  const { state, filter: userFilter, sort } = parseCatalogQuery(searchParams ?? {}, { usdRate });
  // The collection scope is kept apart from the user's filters so facets/user input can never widen it.
  const filter = { ...userFilter, base: baseFilter };

  const [listing, facets, salesData] = await Promise.all([
    resilient(label, () => paginatePublishedProducts({ filter, sort, page: state.page, pageSize: PAGE_SIZE, locale }), { items: [], total: 0, page: 1, pageCount: 1 }),
    resilient(`${label} facets`, () => getFilterFacets(filter, { parentCategoryId, locale }), EMPTY_FACETS),
    resilient("sales data", () => hasSalesData(), false),
  ]);
  return { state, products: await cards(listing.items), total: listing.total, page: listing.page, pageCount: listing.pageCount, facets, salesData, usdRate };
}

/**
 * A collection = editorial definition (src/content/collections.js) and/or a database
 * category with the same slug, filtered/sorted/paginated by the URL query.
 * Returns null when neither exists.
 */
export async function getCollection(slug, { locale = DEFAULT_LOCALE, searchParams } = {}) {
  const definition = getCollectionDefinition(slug);
  const category = await resilient(`category ${slug}`, () => getCategoryBySlug(slug, { locale }), null);
  if (!definition && !category) return null;

  // Editorial copy for defined collections is localised via the dictionaries (collectionCopy.<slug>).
  const t = definition ? await getTranslator(locale) : null;
  const copy = (field) => t(`collectionCopy.${slug}.${field}`);

  const collection = {
    slug,
    title: category?.name ?? copy("title"),
    eyebrow: definition ? copy("eyebrow") : (category?.parent?.name ?? ""),
    description: definition ? copy("description") : (category?.description ?? ""),
    image: category?.imageUrl ? { src: category.imageUrl, alt: category.name } : definition?.image ? { ...definition.image, alt: copy("title") } : null,
    filter: definition?.filter ?? { categories: [slug] },
    parent: category?.parent ? { name: category.parent.name, slug: category.parent.slug } : null,
  };

  // Subcategory facet is offered on department pages (top-level categories).
  const parentCategoryId = category && !category.parentId ? category.id : null;
  const listing = await runListing(`collection ${slug}`, { baseFilter: collection.filter, searchParams, locale, parentCategoryId });
  return { collection, ...listing };
}

/** Search results with the same filters / sorting / pagination as collections. */
export async function getSearchResults({ locale = DEFAULT_LOCALE, searchParams } = {}) {
  return runListing("search", { baseFilter: {}, searchParams, locale });
}

/** Full product page data (all images, variants, details) or null. */
export async function getProductDetail(slug, { locale = DEFAULT_LOCALE } = {}) {
  const usdRate = await getUsdRate();
  const record = await getPublishedProductBySlug(slug, { locale });
  return record ? toProductDetail(record, { usdRate }) : null;
}

/** Text search across published products. */
export async function searchProducts(text, { limit = 24, locale = DEFAULT_LOCALE } = {}) {
  const filter = { search: text };
  const [records, total] = await Promise.all([listPublishedProducts({ filter, take: limit, locale }), countPublishedProducts(filter)]);
  return { results: await cards(records), total };
}

/** Pieces from the same category (then the same department) for "You may also like". */
export async function getRelatedProducts(product, { limit = 4, locale = DEFAULT_LOCALE } = {}) {
  if (!product?.category) return [];
  return resilient("related products", async () => {
    const same = await listPublishedProducts({ filter: { categories: [product.category.slug] }, take: limit + 1, locale });
    let records = same.filter((record) => record.id !== product.id);
    const parent = product.category.parent?.slug;
    if (records.length < limit && parent) {
      const wider = await listPublishedProducts({ filter: { categories: [parent] }, take: limit + 1 + records.length, locale });
      const seen = new Set([product.id, ...records.map((record) => record.id)]);
      records = [...records, ...wider.filter((record) => !seen.has(record.id))];
    }
    return cards(records.slice(0, limit));
  });
}
