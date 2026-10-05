"use server";

// Checkout Server Action. The browser sends contact/delivery details, the chosen
// delivery & payment method and an idempotency key — never prices or totals.
import { redirect } from "next/navigation";
import { after } from "next/server";
import { siteConfig } from "@/config/site";
import { isSupportedLocale } from "@/i18n/config";
import { localizeHref } from "@/i18n/navigation";
import { runCustomerAction } from "@/lib/actions";
import { getExchangeRate } from "@/lib/currency/rates";
import { getDb } from "@/lib/db";
import { ValidationError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { getPaymentProvider, isPaymentMethodAvailable } from "@/lib/payments";
import { rateLimit } from "@/lib/security/rate-limit";
import { formDataToObject, validate } from "@/lib/validation";
import { checkoutSchema } from "@/lib/validation/schemas/commerce";
import { createAddress, listAddresses } from "@/services/addressService";
import { placeOrder } from "@/services/orderService";
import { notifyOrderPlaced } from "@/services/notificationService";
import { applyPaymentResult } from "@/services/paymentService";

const CHECKOUT_RATE = { limit: 10, windowMs: 10 * 60 * 1000 };

/** Start a hosted online payment; on any failure the order is closed and stock released. */
async function startOnlinePayment(order, locale) {
  const provider = getPaymentProvider(order.payment.method);
  const confirmation = localizeHref(`/checkout/confirmation/${order.orderNumber}`, locale);
  try {
    const session = await provider.createPayment({
      order,
      payment: order.payment,
      returnUrl: new URL(`/api/payments/${order.payment.method.toLowerCase()}/return?order=${order.orderNumber}`, siteConfig.url).toString(),
      callbackUrl: new URL(`/api/payments/${order.payment.method.toLowerCase()}/callback`, siteConfig.url).toString(),
    });
    await getDb().payment.update({ where: { id: order.payment.id }, data: { providerReference: session.reference, providerData: session.data ?? undefined } });
    return session.redirectUrl;
  } catch (error) {
    logger.error("Online payment could not be started", { orderNumber: order.orderNumber, error });
    await applyPaymentResult({ orderId: order.id, status: "FAILED", reason: "Payment could not be started" });
    return confirmation;
  }
}

export async function placeOrderAction(_prev, formData) {
  const input = formDataToObject(formData);
  if (input.whatsappSame) input.whatsappNumber = input.phone;
  const { idempotencyKey: _key, whatsappSame: _same, ...values } = input;
  let target;

  const result = await runCustomerAction("place order", input.locale, async (user) => {
    const data = validate(checkoutSchema, input);

    if (!isPaymentMethodAvailable(data.paymentMethod)) throw new ValidationError(undefined, { paymentMethod: ["unavailable"] });

    rateLimit(`checkout:${user.id}`, CHECKOUT_RATE);

    // Saved address: re-read from the customer's OWN address book (never trust the form copy).
    let delivery = { addressLine: data.addressLine, city: data.city, postalCode: data.postalCode, country: data.country };
    if (data.addressId) {
      const saved = (await listAddresses(user.id)).find((address) => address.id === data.addressId);
      if (!saved) throw new ValidationError(undefined, { addressId: ["invalid"] });
      delivery = { addressLine: saved.addressLine, city: saved.city, postalCode: saved.postalCode, country: saved.country };
    }

    const rate = data.displayCurrency === "USD" ? (await getExchangeRate("PKR", "USD"))?.rate ?? null : null;
    const locale = isSupportedLocale(input.locale) ? input.locale : "en";
    const { order, created } = await placeOrder(user, { ...data, ...delivery, locale }, { exchangeRate: rate });

    if (created && data.saveAddress && !data.addressId) {
      await createAddress(user.id, { fullName: data.fullName, phone: data.phone, ...delivery, isDefault: false }).catch((error) =>
        logger.warn("Checkout address not saved to account", { error: error.message }),
      );
    }

    // COD orders are final now → confirmations after the response (never blocking checkout).
    // Online orders notify only once the provider has verified the payment.
    if (created && order.payment?.method === "COD") after(() => notifyOrderPlaced(order.id));

    target =
      order.payment?.method !== "COD" && created && order.payment.status === "PENDING"
        ? await startOnlinePayment(order, locale)
        : localizeHref(`/checkout/confirmation/${order.orderNumber}`, locale);
  });

  if (result.ok) redirect(target);
  // Never echo the idempotency key back: a retry after an error keeps the original key from the form.
  return { ...result, values };
}

