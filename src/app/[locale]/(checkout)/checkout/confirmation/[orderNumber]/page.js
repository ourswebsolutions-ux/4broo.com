import { notFound } from "next/navigation";
import { OrderAddress, OrderItems, OrderMoney, OrderTotals, PaymentLine } from "@/components/order/OrderParts";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { getTranslator } from "@/i18n/server";
import { requireCustomer } from "@/lib/auth/guards";
import { formatMoney } from "@/lib/currency/money";
import { getOrderForUser } from "@/services/orderService";
import { cn } from "@/utils/cn";

export async function generateMetadata({ params }) {
  const t = await getTranslator((await params).locale);
  return { title: t("order.details"), robots: { index: false } };
}

/** Confirmation for the signed-in customer's OWN order (looked up by number + session user). */
export default async function ConfirmationPage({ params }) {
  const { locale, orderNumber } = await params;
  const [user, t] = await Promise.all([requireCustomer({ redirectTo: `/checkout/confirmation/${orderNumber}`, locale }), getTranslator(locale)]);
  const order = await getOrderForUser(user.id, orderNumber).catch(() => null);
  if (!order) notFound();

  const payment = order.payment;
  const failed = payment?.status === "FAILED";
  const paymentCancelled = payment?.status === "CANCELLED" && payment.method !== "COD";
  const pendingOnline = payment?.method !== "COD" && payment?.status === "PENDING";
  const ok = !failed && !paymentCancelled && order.status !== "CANCELLED";
  const firstName = order.customerName.split(" ")[0];

  return (
    <div className="container-page pb-24 pt-10 sm:pt-16">
      <section className="mx-auto flex max-w-2xl flex-col items-center gap-5 text-center">
        <span
          className={cn("grid size-16 animate-[pop_600ms_var(--ease-luxe)_both] place-items-center rounded-full border", ok ? "border-ink bg-ink text-gold" : "border-danger text-danger")}
          aria-hidden="true"
        >
          <Icon name={ok ? "check" : "alert"} className="size-7" strokeWidth={1.75} />
        </span>
        <p className="eyebrow text-gold-deep">{ok ? t("order.placed") : failed ? t("order.failedTitle") : paymentCancelled ? t("order.cancelledTitle") : t("order.orderCancelled")}</p>
        <h1 className="headline animate-reveal text-display-sm">{t("order.thankYou", { name: firstName })}</h1>
        <p className="max-w-md text-sm leading-relaxed text-subtle">
          {ok ? (pendingOnline ? t("order.pendingText") : t("order.placedText")) : failed ? t("order.failedText") : paymentCancelled ? t("order.cancelledText") : t("order.orderCancelled")}
        </p>
        <div className="mt-2 flex flex-col items-center gap-1.5 border border-line px-8 py-5">
          <span className="eyebrow !text-[0.625rem] text-mute">{t("order.number")}</span>
          <bdi dir="ltr" className="font-[family-name:var(--font-manrope)] text-xl font-medium tabular-nums tracking-[0.08em] sm:text-2xl">
            {order.orderNumber}
          </bdi>
        </div>
        {ok && payment?.method === "COD" ? <p className="text-sm text-subtle">{t("order.codNote", { amount: formatMoney(String(order.total), "PKR") })}</p> : null}
        <div className="mt-3 flex flex-wrap justify-center gap-3">
          {ok ? (
            <>
              <Button href={`/account/orders/${order.orderNumber}`}>
                <Icon name="package" className="size-4" />
                {t("order.track")}
              </Button>
              <Button href="/collections/new-arrivals" variant="secondary" arrow>
                {t("order.continue")}
              </Button>
            </>
          ) : (
            <>
              <Button href="/cart">{t("order.retry")}</Button>
              <Button href="/contact" variant="secondary">
                {t("order.support")}
              </Button>
            </>
          )}
        </div>
      </section>

      <div className="mx-auto mt-16 grid max-w-5xl gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <section aria-labelledby="items-title" className="flex flex-col gap-6 border border-line p-6 sm:p-8">
          <h2 id="items-title" className="eyebrow">
            {t("order.items")}
          </h2>
          <OrderItems order={order} />
          <div className="border-t border-line pt-5">
            <OrderTotals order={order} t={t} />
          </div>
        </section>
        <div className="flex flex-col gap-6">
          <section aria-labelledby="payment-title" className="flex flex-col gap-4 border border-line p-6">
            <h2 id="payment-title" className="eyebrow">
              {t("checkout.payment")}
            </h2>
            <PaymentLine order={order} t={t} />
            <p className="text-xs text-mute">
              {t("checkout.total")}: <OrderMoney amount={order.total} order={order} className="!inline" />
            </p>
          </section>
          <section aria-labelledby="address-title" className="flex flex-col gap-4 border border-line p-6">
            <h2 id="address-title" className="eyebrow">
              {t("order.deliverTo")}
            </h2>
            <OrderAddress order={order} />
          </section>
        </div>
      </div>
    </div>
  );
}
