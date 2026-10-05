// Server-rendered order building blocks (confirmation, account order page, tracking).
// Everything shown comes from the stored order snapshot — nothing is recomputed or invented.
import { ImagePlaceholder, SmartImage } from "@/components/media/SmartImage";
import { Icon } from "@/components/ui/Icon";
import { LOCALES } from "@/i18n/config";
import { convertMoney, formatMoney } from "@/lib/currency/money";
import { cn } from "@/utils/cn";

export const ORDER_FLOW = ["NEW", "CONFIRMED", "PROCESSING", "PACKED", "SHIPPED", "DELIVERED"];

const dateTime = (value, locale) =>
  new Intl.DateTimeFormat(LOCALES[locale]?.numberingLocale ?? "en-PK", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(value));

/** PKR amount as charged, plus "≈ $x" when the customer browsed in USD (rate stored on the order). */
export function OrderMoney({ amount, order, className, strong = false }) {
  const usd = order.displayCurrency === "USD" && order.exchangeRate ? convertMoney(String(amount), String(order.exchangeRate)) : null;
  return (
    <span className={cn("inline-flex flex-col tabular-nums", className)}>
      <bdi dir="ltr" className={cn(strong && "font-medium")}>
        {formatMoney(String(amount), order.currency)}
      </bdi>
      {usd ? (
        <bdi dir="ltr" className="text-xs text-mute">
          ≈ {formatMoney(usd, "USD")}
        </bdi>
      ) : null}
    </span>
  );
}

/**
 * Progress timeline. Only stages the order has actually reached are marked
 * complete; a cancelled order shows where it stopped and a clear cancelled state.
 */
export function OrderTimeline({ order, t, locale }) {
  const reached = new Map();
  for (const event of order.statusEvents ?? []) if (!reached.has(event.status)) reached.set(event.status, event.createdAt);
  const cancelled = order.status === "CANCELLED";
  const currentIndex = cancelled ? Math.max(...ORDER_FLOW.map((status, index) => (reached.has(status) ? index : -1)), 0) : ORDER_FLOW.indexOf(order.status);
  const steps = cancelled ? [...ORDER_FLOW.slice(0, currentIndex + 1), "CANCELLED"] : ORDER_FLOW;

  return (
    <ol aria-label={t("order.progress")} className="flex flex-col">
      {steps.map((status, index) => {
        const done = cancelled ? true : index <= currentIndex;
        const current = cancelled ? status === "CANCELLED" : index === currentIndex;
        const last = index === steps.length - 1;
        const when = reached.get(status);
        return (
          <li key={status} aria-current={current ? "step" : undefined} className="relative flex gap-5 pb-8 last:pb-0" style={{ animation: `fade 450ms ease-out ${index * 90}ms both` }}>
            {!last ? <span aria-hidden="true" className={cn("absolute start-[0.6875rem] top-6 h-[calc(100%-1.5rem)] w-px", done && !current ? "bg-ink" : "bg-line")} /> : null}
            <span
              aria-hidden="true"
              className={cn(
                "relative z-10 grid size-6 shrink-0 place-items-center rounded-full border",
                status === "CANCELLED" ? "border-danger bg-danger text-paper" : current ? "border-ink bg-ink text-gold" : done ? "border-ink bg-paper text-ink" : "border-line bg-paper",
              )}
            >
              {status === "CANCELLED" ? <Icon name="close" className="size-3" strokeWidth={2} /> : done ? <Icon name="check" className="size-3" strokeWidth={2} /> : null}
            </span>
            <span className="flex min-w-0 flex-col gap-0.5 pt-0.5">
              <span className={cn("text-sm", current ? "font-medium text-ink" : done ? "text-ink" : "text-mute", status === "CANCELLED" && "text-danger")}>{t(`order.steps.${status}`)}</span>
              <span className="text-xs text-mute">
                {current ? t("order.current") : done ? t("order.completed") : t("order.upcoming")}
                {when && done ? ` · ${dateTime(when, locale)}` : ""}
              </span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}

export function OrderItems({ order }) {
  return (
    <ul className="divide-y divide-line">
      {order.items.map((item) => (
        <li key={item.id} className="flex gap-4 py-4 first:pt-0">
          <span className="relative h-24 w-20 shrink-0 overflow-hidden bg-bone">
            {item.imageUrl ? <SmartImage src={item.imageUrl} alt="" fill sizes="80px" className="object-cover" /> : <ImagePlaceholder className="absolute inset-0" />}
          </span>
          <span className="flex min-w-0 flex-1 flex-col gap-1">
            <span className="text-sm leading-snug">{item.productName}</span>
            <span className="text-xs text-subtle">{[item.size, item.color].filter(Boolean).join(" · ")}</span>
            <span className="text-xs text-mute">
              <bdi dir="ltr">{item.sku}</bdi> · × {item.quantity}
            </span>
          </span>
          <OrderMoney amount={item.lineTotal} order={order} className="shrink-0 text-end text-sm" />
        </li>
      ))}
    </ul>
  );
}

export function OrderTotals({ order, t }) {
  return (
    <dl className="flex flex-col gap-3 text-sm">
      <div className="flex justify-between gap-4">
        <dt className="text-subtle">{t("checkout.subtotal")}</dt>
        <dd>
          <OrderMoney amount={order.subtotal} order={order} className="items-end" />
        </dd>
      </div>
      <div className="flex justify-between gap-4">
        <dt className="text-subtle">{t("checkout.deliveryFee")}</dt>
        <dd className="text-end">{order.deliveryFeeConfirmed ? <OrderMoney amount={order.deliveryFee} order={order} className="items-end" /> : <span className="text-subtle">{t("checkout.tbc")}</span>}</dd>
      </div>
      <div className="flex items-baseline justify-between gap-4 border-t border-line pt-4">
        <dt className="eyebrow">{t("checkout.total")}</dt>
        <dd className="text-lg">
          <OrderMoney amount={order.total} order={order} strong className="items-end" />
        </dd>
      </div>
      {!order.deliveryFeeConfirmed ? <p className="text-xs text-mute">{t("order.tbcNote")}</p> : null}
    </dl>
  );
}

export function OrderAddress({ order }) {
  return (
    <address className="flex flex-col gap-1 text-sm not-italic leading-relaxed">
      <span className="font-medium">{order.customerName}</span>
      <span>{order.address}</span>
      <span>{[order.city, order.postalCode].filter(Boolean).join(" ")}</span>
      <span>{order.country}</span>
      <bdi dir="ltr" className="text-subtle">
        +{order.customerPhone}
      </bdi>
    </address>
  );
}

const PAYMENT_TONE = { PAID: "text-success", FAILED: "text-danger", CANCELLED: "text-danger", PENDING: "text-gold-deep" };

export function PaymentLine({ order, t }) {
  const payment = order.payment;
  if (!payment) return null;
  return (
    <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-6 gap-y-2 text-sm">
      <dt className="text-mute">{t("order.method")}</dt>
      <dd>{t(`order.methods.${payment.method}`)}</dd>
      <dt className="text-mute">{t("order.payment")}</dt>
      <dd className={PAYMENT_TONE[payment.status]}>{t(`order.paymentStatuses.${payment.status}`)}</dd>
    </dl>
  );
}

export { dateTime as formatOrderDateTime };
