import { siteConfig } from "@/config/site";
import { collections } from "@/content/collections";
import { INFO_PAGE_SLUGS } from "@/content/pages";
import { LOCALES, SUPPORTED_LOCALES } from "@/i18n/config";
import { localizeHref } from "@/i18n/navigation";
import { logger } from "@/lib/logger";
import { listCategoryTree } from "@/services/categoryService";
import { listPublishedSlugs } from "@/services/productService";

// Rebuilt at most hourly: new products and categories appear without a deploy.
export const revalidate = 3600;

const absolute = (path) => `${siteConfig.url}${path === "/" ? "" : path}` || siteConfig.url;

/** One entry per language version, each listing all versions as hreflang alternates. */
function entries(path, { lastModified, changeFrequency, priority }) {
  const languages = Object.fromEntries(SUPPORTED_LOCALES.map((code) => [LOCALES[code].htmlLang, absolute(localizeHref(path, code))]));
  return SUPPORTED_LOCALES.map((code) => ({
    url: absolute(localizeHref(path, code)),
    lastModified,
    changeFrequency,
    priority,
    alternates: { languages },
  }));
}

async function safe(label, task) {
  try {
    return await task();
  } catch (error) {
    logger.error(`Sitemap: ${label} unavailable`, { error });
    return [];
  }
}

export default async function sitemap() {
  const now = new Date();
  const [products, tree] = await Promise.all([safe("products", () => listPublishedSlugs()), safe("categories", () => listCategoryTree())]);

  const collectionSlugs = new Set(collections.map((collection) => collection.slug));
  for (const department of tree) {
    collectionSlugs.add(department.slug);
    for (const child of department.children ?? []) collectionSlugs.add(child.slug);
  }

  return [
    ...entries("/", { lastModified: now, changeFrequency: "daily", priority: 1 }),
    ...[...collectionSlugs].flatMap((slug) => entries(`/collections/${slug}`, { lastModified: now, changeFrequency: "daily", priority: 0.8 })),
    ...products.flatMap((product) => entries(`/products/${product.slug}`, { lastModified: product.updatedAt, changeFrequency: "weekly", priority: 0.7 })),
    ...INFO_PAGE_SLUGS.flatMap((slug) => entries(`/${slug}`, { lastModified: now, changeFrequency: "monthly", priority: 0.4 })),
    ...entries("/track-order", { lastModified: now, changeFrequency: "yearly", priority: 0.3 }),
  ];
}
