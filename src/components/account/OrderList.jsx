import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import { LOCALES } from "@/i18n/config";
import { formatMoney } from "@/lib/currency/money";
import Link from "@/i18n/Link";
import { formatDate } from "@/utils/format";
import { cn } from "@/utils/cn";

const STATUS_TONE = { CANCELLED: "text-danger", DELIVERED: "text-success" };

/** The customer's real orders (none are ever invented) — or a clean empty state. */
export function OrderList({ orders, t, locale }) {
  if (!orders.length) {
    return (
      <EmptyState
        icon="package"
        title={t("account.noOrders")}
        description={t("account.noOrdersText")}
        action={
          <Button href="/collections/new-arrivals" arrow>
            {t("cart.continue")}
          </Button>
        }
      />
    );
  }

  return (
    <div className="overflow-x-auto border border-line">
      <table className="w-full min-w-[42rem] text-sm">
        <thead>
          <tr className="border-b border-line text-start">
            {["account.orderNumber", "account.orderDate", "account.orderStatus", "order.payment", "account.orderTotal"].map((key) => (
              <th key={key} scope="col" className={cn("eyebrow px-5 py-4 text-start font-normal text-mute", key === "account.orderTotal" && "text-end")}>
                {t(key)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {orders.map((order) => (
            <tr key={order.id}>
              <td className="px-5 py-4 font-medium tabular-nums">
                <Link href={`/account/orders/${order.orderNumber}`} className="underline decoration-line underline-offset-4 hover:decoration-ink">
                  <bdi dir="ltr">{order.orderNumber}</bdi>
                </Link>
              </td>
              <td className="px-5 py-4 text-subtle">{formatDate(order.createdAt, LOCALES[locale].numberingLocale)}</td>
              <td className={cn("px-5 py-4", STATUS_TONE[order.status])}>{t(`account.orderStatuses.${order.status}`)}</td>
              <td className="px-5 py-4 text-subtle">{order.payment ? `${t(`order.methods.${order.payment.method}`)} · ${t(`order.paymentStatuses.${order.payment.status}`)}` : "—"}</td>
              <td className="px-5 py-4 text-end tabular-nums">
                <bdi dir="ltr">{formatMoney(String(order.total), order.currency)}</bdi>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
