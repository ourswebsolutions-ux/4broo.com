import { z } from "zod";
import { searchProducts } from "@/data/catalog";
import { searchCategories } from "@/services/categoryService";
import { DEFAULT_LOCALE, SUPPORTED_LOCALES } from "@/i18n/config";
import { apiHandler } from "@/lib/api";
import { validateSearchParams } from "@/lib/validation";

const querySchema = z.object({
  q: z.string().trim().min(1, { error: "Enter a search term." }).max(80),
  limit: z.coerce.number().int().min(1).max(24).default(8),
  locale: z.enum(SUPPORTED_LOCALES).default(DEFAULT_LOCALE),
});

/** Public product search used by the search overlay. */
export const GET = apiHandler(async ({ request }) => {
  const { q, limit, locale } = validateSearchParams(new URL(request.url).searchParams, querySchema);
  const [{ results, total }, categories] = await Promise.all([searchProducts(q, { limit, locale }), searchCategories(q, { locale })]);
  return { query: q, results, total, categories };
});
