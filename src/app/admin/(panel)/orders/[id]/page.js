import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminNoteForm, CodPaymentControl, OrderStatusControls, RetryNotificationButton } from "@/components/admin/orders/OrderControls";
import { Section, StatusBadge } from "@/components/admin/ui";
import { ImagePlaceholder, SmartImage } from "@/components/media/SmartImage";
import { requireAdmin } from "@/lib/auth/guards";
import { formatMoney } from "@/lib/currency/money";
import { listOrderNotifications } from "@/services/notificationService";
import { ORDER_TRANSITIONS, getAdminOrder } from "@/services/orderService";

export const metadata = { title: "Order" };

const dateTime = (value) => new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(value);
const pkr = (value) => formatMoney(String(value), "PKR");

export default async function AdminOrderPage({ params }) {
  await requireAdmin();
  const { id } = await params;
  const order = await getAdminOrder(id).catch(() => null);
  if (!order) notFound();
  const notifications = await listOrderNotifications(order.id);
  const events = Object.values(
    notifications.reduce((groups, row) => {
      (groups[row.eventKey] ??= { eventKey: row.eventKey, type: row.type, audience: row.audience, rows: [] }).rows.push(row);
      return groups;
    }, {}),
  );
  const payment = order.payment;
  // Serialisable subset for the client controls.
  const controlOrder = { id: order.id, orderNumber: order.orderNumber, status: order.status, adminNote: order.adminNote, payment: payment && { method: payment.method, status: payment.status } };

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-3">
        <Link href="/admin/orders" className="eyebrow text-mute hover:text-ink">
          ← Orders
        </Link>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="flex flex-col gap-2">
            <h1 className="font-sans text-2xl font-medium tabular-nums tracking-[0.06em] sm:text-3xl">{order.orderNumber}</h1>
            <p className="text-sm text-subtle">Placed {dateTime(order.createdAt)} · last update {dateTime(order.updatedAt)}</p>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge status={order.status} />
            {payment ? <StatusBadge status={payment.status} /> : null}
          </div>
        </div>
      </header>

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_24rem]">
        <div className="flex flex-col gap-6">
          <Section id="status" title="Status" description="Move the order forward. Cancelling returns reserved stock.">
            <OrderStatusControls order={controlOrder} nextStatuses={ORDER_TRANSITIONS[order.status]} />
          </Section>

          <Section id="items" title={`Items (${order.items.length})`}>
            <ul className="divide-y divide-line">
              {order.items.map((item) => (
                <li key={item.id} className="flex gap-4 py-3 first:pt-0">
                  <span className="relative h-20 w-16 shrink-0 overflow-hidden bg-bone">
                    {item.imageUrl ? <SmartImage src={item.imageUrl} alt="" fill sizes="64px" className="object-cover" /> : <ImagePlaceholder className="absolute inset-0" />}
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col gap-1 text-sm">
                    <span>{item.productName}</span>
                    <span className="text-xs text-subtle">{[item.size, item.color].filter(Boolean).join(" · ")}</span>
                    <span className="text-xs text-mute tabular-nums">
                      {item.sku} · {pkr(item.unitPrice)} × {item.quantity}
                    </span>
                  </span>
                  <span className="shrink-0 text-sm tabular-nums">{pkr(item.lineTotal)}</span>
                </li>
              ))}
            </ul>
            <dl className="mt-4 flex flex-col gap-2 border-t border-line pt-4 text-sm">
              <div className="flex justify-between"><dt className="text-subtle">Subtotal</dt><dd className="tabular-nums">{pkr(order.subtotal)}</dd></div>
              {Number(order.discount) ? <div className="flex justify-between"><dt className="text-subtle">Discount</dt><dd className="tabular-nums">−{pkr(order.discount)}</dd></div> : null}
              <div className="flex justify-between">
                <dt className="text-subtle">Delivery ({order.deliveryMethod.toLowerCase()})</dt>
                <dd className="tabular-nums">{order.deliveryFeeConfirmed ? pkr(order.deliveryFee) : "To be confirmed with the customer"}</dd>
              </div>
              <div className="flex justify-between border-t border-line pt-2 font-medium"><dt>Total</dt><dd className="tabular-nums">{pkr(order.total)}</dd></div>
              {order.displayCurrency === "USD" && order.exchangeRate ? <p className="text-xs text-mute">Customer browsed in USD (rate {String(order.exchangeRate)} per PKR). Charged in PKR.</p> : null}
            </dl>
          </Section>

          <Section id="notifications" title="Notifications" description="Customer: WhatsApp first, email only if WhatsApp fails. Admin: both channels.">
            {events.length ? (
              <ul className="flex flex-col divide-y divide-line">
                {events.map((event) => {
                  const delivered = event.rows.some((row) => row.status === "SENT");
                  const canRetry = event.audience === "ADMIN" ? event.rows.some((row) => row.status === "FAILED") : !delivered && event.rows.some((row) => row.status === "FAILED");
                  const label = event.eventKey.split(":").slice(2, -1)[0];
                  return (
                    <li key={event.eventKey} className="flex flex-col gap-2 py-3 first:pt-0">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-sm font-medium">
                          {event.audience === "ADMIN" ? "Admin alert" : "Customer"} · {event.type.replace(/_/g, " ").toLowerCase()}
                          {label ? ` · ${label.toLowerCase()}` : ""}
                        </span>
                        {canRetry ? <RetryNotificationButton orderId={order.id} eventKey={event.eventKey} /> : null}
                      </div>
                      <ul className="flex flex-col gap-1.5">
                        {event.rows.map((row) => (
                          <li key={row.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                            <span className="w-20 font-medium">{row.channel === "WHATSAPP" ? "WhatsApp" : "Email"}</span>
                            <StatusBadge status={row.status} />
                            <span className="text-mute tabular-nums">{row.recipient ? (row.channel === "WHATSAPP" ? `+${row.recipient}` : row.recipient) : "—"}</span>
                            {row.fallbackFrom ? <span className="text-gold-deep">fallback from WhatsApp</span> : null}
                            <span className="text-mute">attempts {row.attempts}</span>
                            <span className="text-mute">{dateTime(row.updatedAt)}</span>
                            {row.errorMessage ? <span className="basis-full text-danger">{row.errorMessage}</span> : null}
                          </li>
                        ))}
                      </ul>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="text-sm text-mute">No notifications for this order yet.</p>
            )}
          </Section>

          <Section id="history" title="History">
            <ol className="flex flex-col gap-3 text-sm">
              {order.statusEvents.map((event) => (
                <li key={event.id} className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <span className="w-40 shrink-0 text-xs tabular-nums text-mute">{dateTime(event.createdAt)}</span>
                  <StatusBadge status={event.status} />
                  <span className="text-xs text-subtle">by {event.actor.toLowerCase()}</span>
                  {event.note ? <span dir="auto" className="text-subtle">— {event.note}</span> : null}
                </li>
              ))}
            </ol>
          </Section>
        </div>

        <div className="flex flex-col gap-6">
          <Section id="customer" title="Customer">
            <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-5 gap-y-2 text-sm">
              <dt className="text-mute">Name</dt><dd dir="auto">{order.customerName}</dd>
              <dt className="text-mute">Email</dt><dd className="break-all"><a href={`mailto:${order.customerEmail}`} className="underline underline-offset-2">{order.customerEmail}</a></dd>
              <dt className="text-mute">Phone</dt><dd className="tabular-nums">+{order.customerPhone}</dd>
              <dt className="text-mute">WhatsApp</dt><dd className="tabular-nums">{order.whatsappNumber ? `+${order.whatsappNumber}` : "—"}</dd>
              <dt className="text-mute">Account</dt><dd>{order.user ? `${order.user.firstName} ${order.user.lastName} (${order.user.email})` : "No account"}</dd>
            </dl>
          </Section>

          <Section id="delivery" title="Delivery address">
            <address dir="auto" className="flex flex-col gap-1 text-sm not-italic leading-relaxed">
              <span>{order.customerName}</span>
              <span>{order.address}</span>
              <span>{[order.city, order.postalCode].filter(Boolean).join(" ")}</span>
              <span>{order.country}</span>
            </address>
            {order.customerNote ? (
              <p dir="auto" className="mt-4 border-t border-line pt-3 text-sm">
                <span className="eyebrow me-2 text-mute">Customer note</span>
                {order.customerNote}
              </p>
            ) : null}
          </Section>

          <Section id="payment" title="Payment" actions={payment?.method === "COD" && payment.status === "PENDING" && order.status !== "CANCELLED" ? <CodPaymentControl order={controlOrder} /> : null}>
            {payment ? (
              <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-5 gap-y-2 text-sm">
                <dt className="text-mute">Method</dt><dd>{payment.method === "COD" ? "Cash on delivery" : payment.method}</dd>
                <dt className="text-mute">Status</dt><dd><StatusBadge status={payment.status} /></dd>
                <dt className="text-mute">Amount</dt><dd className="tabular-nums">{formatMoney(String(payment.amount), payment.currency)}</dd>
                {payment.providerReference ? <><dt className="text-mute">Reference</dt><dd className="break-all">{payment.providerReference}</dd></> : null}
                {payment.paidAt ? <><dt className="text-mute">Paid</dt><dd>{dateTime(payment.paidAt)}</dd></> : null}
                {payment.failureReason ? <><dt className="text-mute">Reason</dt><dd>{payment.failureReason}</dd></> : null}
              </dl>
            ) : (
              <p className="text-sm text-mute">No payment record.</p>
            )}
          </Section>

          <Section id="note" title="Internal note">
            <AdminNoteForm order={controlOrder} />
          </Section>
        </div>
      </div>
    </div>
  );
}
