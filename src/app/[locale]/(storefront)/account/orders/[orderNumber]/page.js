import { notFound } from "next/navigation";
import { OrderAddress, OrderItems, OrderTimeline, OrderTotals, PaymentLine, formatOrderDateTime } from "@/components/order/OrderParts";
import { Icon } from "@/components/ui/Icon";
import Link from "@/i18n/Link";
import { getTranslator } from "@/i18n/server";
import { requireCustomer } from "@/lib/auth/guards";
import { getOrderForUser } from "@/services/orderService";

/** Order details — only the signed-in customer's own orders (number + session user, never a raw id). */
export default async function OrderDetailPage({ params }) {
  const { locale, orderNumber } = await params;
  const [user, t] = await Promise.all([requireCustomer({ redirectTo: `/account/orders/${orderNumber}`, locale }), getTranslator(locale)]);
  const order = await getOrderForUser(user.id, orderNumber).catch(() => null);
  if (!order) notFound();

  return (
    <div className="flex flex-col gap-10">
      <div className="flex flex-col gap-4 border-b border-ink pb-5">
        <Link href="/account/orders" className="inline-flex min-h-9 items-center gap-2 self-start text-xs text-subtle hover:text-ink">
          <Icon name="arrowRight" className="size-3.5 -scale-x-100 rtl:scale-x-100" />
          {t("order.allOrders")}
        </Link>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h1 className="font-[family-name:var(--font-manrope)] text-xl font-medium tabular-nums tracking-[0.08em] sm:text-2xl">
            <bdi dir="ltr">{order.orderNumber}</bdi>
          </h1>
          <p className="text-sm text-subtle">
            {t("order.date")}: {formatOrderDateTime(order.createdAt, locale)}
          </p>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_18rem]">
        <section aria-labelledby="items-title" className="flex flex-col gap-6 border border-line p-6 sm:p-8">
          <h2 id="items-title" className="eyebrow">{t("order.items")}</h2>
          <OrderItems order={order} />
          <div className="border-t border-line pt-5">
            <OrderTotals order={order} t={t} />
          </div>
        </section>
        <section aria-labelledby="progress-title" className="flex flex-col gap-6 border border-line p-6">
          <h2 id="progress-title" className="eyebrow">{t("order.progress")}</h2>
          <OrderTimeline order={order} t={t} locale={locale} />
        </section>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <section aria-labelledby="pay-title" className="flex flex-col gap-4 border border-line p-6">
          <h2 id="pay-title" className="eyebrow">{t("checkout.payment")}</h2>
          <PaymentLine order={order} t={t} />
        </section>
        <section aria-labelledby="addr-title" className="flex flex-col gap-4 border border-line p-6">
          <h2 id="addr-title" className="eyebrow">{t("order.deliverTo")}</h2>
          <OrderAddress order={order} />
          {order.customerNote ? (
            <p className="border-t border-line pt-3 text-sm text-subtle">
              <span className="eyebrow me-2 !text-[0.625rem] text-mute">{t("order.note")}</span>
              {order.customerNote}
            </p>
          ) : null}
        </section>
      </div>
    </div>
  );
}
