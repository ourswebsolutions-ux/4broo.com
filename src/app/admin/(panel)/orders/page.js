import Link from "next/link";
import { StatusBadge } from "@/components/admin/ui";
import { EmptyState } from "@/components/ui/EmptyState";
import { requireAdmin } from "@/lib/auth/guards";
import { formatMoney } from "@/lib/currency/money";
import { ORDER_STATUSES, listAdminOrders } from "@/services/orderService";
import { cn } from "@/utils/cn";

export const metadata = { title: "Orders" };

const dateTime = (value) => new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(value);

function hrefWith(current, changes) {
  const params = new URLSearchParams({ ...current, ...changes });
  for (const [key, value] of [...params]) if (!value || (key === "page" && value === "1")) params.delete(key);
  const query = params.toString();
  return `/admin/orders${query ? `?${query}` : ""}`;
}

/** Customer-created orders (no manual order creation exists in the admin). */
export default async function AdminOrdersPage({ searchParams }) {
  await requireAdmin();
  const params = await searchParams;
  const current = {
    q: typeof params.q === "string" ? params.q.slice(0, 80) : "",
    status: ORDER_STATUSES.includes(params.status) ? params.status : "",
    page: String(Math.max(1, Number.parseInt(params.page ?? "1", 10) || 1)),
  };
  const { items, total, page, pageCount, statusCounts } = await listAdminOrders({ q: current.q || undefined, status: current.status || undefined, page: Number(current.page) });
  const allCount = Object.values(statusCounts).reduce((sum, n) => sum + n, 0);

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-2">
        <p className="eyebrow text-mute">Sales</p>
        <h1 className="font-display text-display-sm font-light">Orders</h1>
        <p className="text-sm text-subtle">Orders are placed by customers at checkout and managed here.</p>
      </header>

      <nav aria-label="Filter by status" className="-mb-2 flex gap-1 overflow-x-auto border-b border-line">
        {[{ value: "", label: "All", count: allCount }, ...ORDER_STATUSES.map((status) => ({ value: status, label: status.charAt(0) + status.slice(1).toLowerCase(), count: statusCounts[status] ?? 0 }))].map((tab) => {
          const active = current.status === tab.value;
          return (
            <Link
              key={tab.label}
              href={hrefWith(current, { status: tab.value, page: "1" })}
              aria-current={active ? "page" : undefined}
              className={cn("eyebrow -mb-px whitespace-nowrap border-b-2 px-4 py-3", active ? "border-ink text-ink" : "border-transparent text-mute hover:text-ink")}
            >
              {tab.label} <span className="tabular-nums text-mute">({tab.count})</span>
            </Link>
          );
        })}
      </nav>

      <form method="get" action="/admin/orders" className="flex flex-wrap items-end gap-3">
        {current.status ? <input type="hidden" name="status" value={current.status} /> : null}
        <label className="flex min-w-64 flex-1 flex-col gap-2">
          <span className="eyebrow text-subtle">Search</span>
          <input
            type="search"
            name="q"
            defaultValue={current.q}
            placeholder="Order number, customer name, email or phone"
            className="h-11 border border-line bg-paper px-3 text-sm outline-none focus:border-ink"
          />
        </label>
        <button type="submit" className="eyebrow h-11 bg-ink px-6 text-paper hover:bg-ink-soft">
          Search
        </button>
        {current.q ? (
          <Link href={hrefWith({ ...current, q: "" }, { page: "1" })} className="eyebrow flex h-11 items-center px-3 text-mute hover:text-ink">
            Clear
          </Link>
        ) : null}
      </form>

      {items.length ? (
        <>
        {/* Phones: one card per order */}
        <ul className="flex flex-col divide-y divide-line border border-line bg-paper md:hidden">
          {items.map((order) => (
            <li key={order.id}>
              <Link href={`/admin/orders/${order.id}`} className="flex flex-col gap-2 p-4 transition-colors hover:bg-bone/60">
                <span className="flex items-center justify-between gap-3">
                  <span className="font-medium tabular-nums">{order.orderNumber}</span>
                  <StatusBadge status={order.status} />
                </span>
                <span className="text-sm" dir="auto">
                  {order.customerName}
                </span>
                <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-subtle">
                  <span className="text-sm tabular-nums text-ink">{formatMoney(String(order.total), order.currency)}</span>
                  <span>
                    {order._count.items} item{order._count.items === 1 ? "" : "s"}
                  </span>
                  <span>{order.payment?.method === "COD" ? "Cash on delivery" : order.payment?.method}</span>
                  {order.payment ? <StatusBadge status={order.payment.status} /> : null}
                  <span>{dateTime(order.createdAt)}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
        <div className="hidden overflow-x-auto border border-line bg-paper md:block">
          <table className="w-full min-w-[56rem] text-sm">
            <thead>
              <tr className="border-b border-line text-start">
                {["Order", "Placed", "Customer", "Items", "Total", "Payment", "Status"].map((label) => (
                  <th key={label} scope="col" className={cn("eyebrow px-4 py-3 text-start font-normal text-mute", label === "Total" && "text-end")}>
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {items.map((order) => (
                <tr key={order.id} className="transition-colors hover:bg-bone/60">
                  <td className="px-4 py-3 font-medium tabular-nums">
                    <Link href={`/admin/orders/${order.id}`} className="underline decoration-line underline-offset-4 hover:decoration-ink">
                      {order.orderNumber}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-subtle">{dateTime(order.createdAt)}</td>
                  <td className="px-4 py-3">
                    <span dir="auto" className="block">{order.customerName}</span>
                    <span className="block text-xs text-mute">{order.customerEmail}</span>
                  </td>
                  <td className="px-4 py-3 tabular-nums">{order._count.items}</td>
                  <td className="px-4 py-3 text-end tabular-nums">{formatMoney(String(order.total), order.currency)}</td>
                  <td className="px-4 py-3">
                    <span className="flex flex-col items-start gap-1">
                      <span className="text-xs text-subtle">{order.payment?.method === "COD" ? "Cash on delivery" : order.payment?.method}</span>
                      {order.payment ? <StatusBadge status={order.payment.status} /> : null}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={order.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        </>
      ) : (
        <EmptyState icon="package" title={current.q || current.status ? "No matching orders" : "No orders yet"} description={current.q || current.status ? "Try another search or status." : "Orders appear here as soon as customers check out."} />
      )}

      {pageCount > 1 ? (
        <nav aria-label="Pagination" className="flex items-center justify-between text-sm">
          <span className="text-mute">
            {total} orders · page {page} of {pageCount}
          </span>
          <span className="flex gap-2">
            {page > 1 ? <Link href={hrefWith(current, { page: String(page - 1) })} className="border border-line px-4 py-2 hover:border-ink">Previous</Link> : null}
            {page < pageCount ? <Link href={hrefWith(current, { page: String(page + 1) })} className="border border-line px-4 py-2 hover:border-ink">Next</Link> : null}
          </span>
        </nav>
      ) : null}
    </div>
  );
}
