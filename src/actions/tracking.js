"use server";

// Public order tracking. Requires the order number AND the email used on the order;
// a mismatch is indistinguishable from "not found". Rate-limited per IP. Returns only
// what tracking needs (status, dates, city) — no address, phone or payment details.
import { headers } from "next/headers";
import { DEFAULT_LOCALE, isSupportedLocale } from "@/i18n/config";
import { getTranslator } from "@/i18n/server";
import { getClientIp } from "@/lib/auth/session";
import { formDataToObject, safeValidate } from "@/lib/validation";
import { rateLimit } from "@/lib/security/rate-limit";
import { trackOrderSchema } from "@/lib/validation/schemas/commerce";
import { findOrderForTracking } from "@/services/orderService";

const TRACK_RATE = { limit: 12, windowMs: 15 * 60 * 1000 };

export async function trackOrderAction(_prev, formData) {
  const input = formDataToObject(formData);
  const t = await getTranslator(isSupportedLocale(input.locale) ? input.locale : DEFAULT_LOCALE);
  const values = { orderNumber: input.orderNumber, email: input.email };

  try {
    const ip = getClientIp(await headers());
    if (ip) rateLimit(`track:${ip}`, TRACK_RATE);
  } catch {
    return { ok: false, message: t("errors.rateLimited"), values };
  }

  const parsed = safeValidate(trackOrderSchema, input);
  if (!parsed.success) return { ok: false, message: t("tracking.notFound"), values };

  const order = await findOrderForTracking(parsed.data.orderNumber, parsed.data.email);
  if (!order) return { ok: false, message: t("tracking.notFound"), values };

  return {
    ok: true,
    values,
    order: {
      orderNumber: order.orderNumber,
      status: order.status,
      createdAt: order.createdAt.toISOString(),
      updatedAt: order.updatedAt.toISOString(),
      city: order.city,
      itemCount: order.items.reduce((sum, item) => sum + item.quantity, 0),
      statusEvents: order.statusEvents.map((event) => ({ status: event.status, createdAt: event.createdAt.toISOString() })),
    },
  };
}
