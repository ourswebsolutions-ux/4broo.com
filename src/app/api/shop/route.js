import { z } from "zod";
import { getShopState } from "@/data/shop";
import { DEFAULT_LOCALE, SUPPORTED_LOCALES } from "@/i18n/config";
import { apiHandler, jsonOk } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth/session";
import { validateSearchParams } from "@/lib/validation";

const querySchema = z.object({ locale: z.enum(SUPPORTED_LOCALES).default(DEFAULT_LOCALE) });

/**
 * The signed-in customer's cart, saved items and wishlist ids (or an empty state
 * for guests). Read client-side so storefront pages stay statically cached;
 * never cached itself because it is per-session.
 */
export const GET = apiHandler(async ({ request }) => {
  const { locale } = validateSearchParams(new URL(request.url).searchParams, querySchema);
  const user = await getCurrentUser();
  // Admin accounts browse the storefront as guests (shopping is customer-only).
  const customer = user?.role === "CUSTOMER" ? user : null;
  const state = await getShopState(customer, { locale });
  return jsonOk({ ...state, signedIn: Boolean(user) }, { headers: { "Cache-Control": "private, no-store" } });
});
