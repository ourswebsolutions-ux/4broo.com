import { NextResponse } from "next/server";
import { siteConfig } from "@/config/site";
import { LOCALE_COOKIE, isSupportedLocale } from "@/i18n/config";
import { localizeHref } from "@/i18n/navigation";
import { getDb } from "@/lib/db";
import { settleFromProvider } from "@/lib/payments/settle";

/**
 * Customer returns from the PayNow page. The query string is NOT trusted: the
 * payment status is fetched from the provider, then the customer is sent to the
 * confirmation page, which shows whatever the verified status is.
 */
export async function GET(request) {
  const url = new URL(request.url);
  const orderNumber = (url.searchParams.get("order") ?? "").toUpperCase().slice(0, 32);
  const locale = request.cookies.get(LOCALE_COOKIE)?.value;
  const order = orderNumber ? await getDb().order.findUnique({ where: { orderNumber }, select: { id: true } }) : null;
  if (order) await settleFromProvider(order.id);
  const path = order ? `/checkout/confirmation/${orderNumber}` : "/account/orders";
  return NextResponse.redirect(new URL(localizeHref(path, isSupportedLocale(locale) ? locale : "en"), siteConfig.url), 303);
}
