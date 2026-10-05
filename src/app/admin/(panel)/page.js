import Link from "next/link";
import { DiagnosticsPanel } from "@/components/admin/DiagnosticsPanel";
import { StatusBadge } from "@/components/admin/ui";
import { SmartImage } from "@/components/media/SmartImage";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { requireAdmin } from "@/lib/auth/guards";
import { formatMoney } from "@/lib/currency/money";
import { LOW_STOCK_THRESHOLD, getAdminDashboard } from "@/services/dashboardService";
import { cn } from "@/utils/cn";

export const metadata = { title: "Overview" };

const pkr = (value) => formatMoney(String(value), "PKR");
const dateTime = (value) => new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(value);

function Stat({ label, value, detail, href, tone }) {
  const body = (
    <>
      <span className="eyebrow text-mute">{label}</span>
      <span className={cn("font-display text-[2rem] font-light leading-none tabular-nums sm:text-[2.5rem]", tone === "gold" && "text-gold-deep")}>{value}</span>
      {detail ? <span className="text-xs leading-relaxed text-subtle">{detail}</span> : null}
    </>
  );
  const className = "flex min-w-0 flex-col gap-3 bg-paper p-5 sm:p-6";
  return href ? (
    <Link href={href} className={cn(className, "transition-colors hover:bg-bone")}>
      {body}
    </Link>
  ) : (
    <div className={className}>{body}</div>
  );
}

function Attention({ href, icon, count, label, tone = "neutral" }) {
  const active = count > 0;
  return (
    <Link
      href={href}
      className={cn(
        "flex min-h-16 items-center gap-4 border px-4 py-3 transition-colors",
        active ? (tone === "danger" ? "border-danger/40 bg-danger/5 hover:bg-danger/10" : "border-gold/50 bg-gold/10 hover:bg-gold/15") : "border-line bg-paper hover:bg-bone",
      )}
    >
      <Icon name={icon} className={cn("size-5 shrink-0", active ? (tone === "danger" ? "text-danger" : "text-gold-deep") : "text-mute")} />
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="text-sm font-medium tabular-nums">{count}</span>
        <span className="text-xs text-subtle">{label}</span>
      </span>
      <span aria-hidden="true" className="text-mute">→</span>
    </Link>
  );
}

export default async function AdminOverviewPage() {
  // Pages render in parallel with layouts, so each admin page re-asserts access.
  const admin = await requireAdmin();
  const data = await getAdminDashboard();
  const { orders, revenue, products, customers } = data;

  return (
    <div className="flex flex-col gap-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-2">
          <p className="eyebrow text-mute">Overview</p>
          <h1 className="font-display text-display-sm font-light">Good to see you, {admin.firstName}</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button href="/admin/products/new" size="sm">
            <Icon name="plus" className="size-4" />
            New product
          </Button>
          <Button href="/admin/orders?status=NEW" variant="secondary" size="sm">
            New orders
          </Button>
        </div>
      </header>

      <section aria-label="Key figures" className="grid grid-cols-2 gap-px border border-line bg-line lg:grid-cols-4">
        <Stat label="Orders" value={orders.total} detail={`${orders.last30Days} in the last 30 days · ${orders.delivered} delivered`} href="/admin/orders" />
        <Stat
          label="Revenue collected"
          value={pkr(revenue.collected)}
          detail={`${pkr(revenue.last30Days)} in the last 30 days. Only payments recorded as paid.`}
          tone="gold"
        />
        <Stat label="Products live" value={products.published} detail={`${products.draft} draft · ${products.archived} archived`} href="/admin/products?status=PUBLISHED" />
        <Stat label="Customers" value={customers.total} detail={`${customers.last30Days} joined in the last 30 days`} />
      </section>

      <section aria-labelledby="attention-heading" className="flex flex-col gap-4">
        <h2 id="attention-heading" className="eyebrow">
          Needs attention
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <Attention href="/admin/orders?status=NEW" icon="bag" count={orders.new} label="New orders to confirm" />
          <Attention href="/admin/orders" icon="package" count={orders.open} label="Orders in progress" />
          <Attention href="/admin/products?status=PUBLISHED" icon="alert" count={products.outOfStock + products.lowStock} label={`Low or out of stock (≤ ${LOW_STOCK_THRESHOLD})`} tone={products.outOfStock ? "danger" : "neutral"} />
          <Attention href="/admin/orders?status=DELIVERED" icon="check" count={revenue.codAwaitingCash} label="Delivered — confirm cash received" />
          <Attention href="/admin/orders" icon="mail" count={data.failedNotifications} label="Failed customer/admin notifications" tone="danger" />
        </div>
        {Number(revenue.expectedCod) > 0 ? (
          <p className="text-xs text-subtle">
            {pkr(revenue.expectedCod)} expected on delivery from {revenue.expectedCodOrders} open cash-on-delivery order{revenue.expectedCodOrders === 1 ? "" : "s"} — counted as revenue once the cash is recorded as received on the order.
          </p>
        ) : null}
      </section>

      <div className="grid grid-cols-1 gap-8 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <section aria-labelledby="recent-heading" className="flex min-w-0 flex-col gap-4">
          <div className="flex items-baseline justify-between gap-3">
            <h2 id="recent-heading" className="eyebrow">
              Recent orders
            </h2>
            <Link href="/admin/orders" className="eyebrow !text-[0.625rem] text-mute hover:text-ink">
              All orders →
            </Link>
          </div>
          {data.recentOrders.length ? (
            <ul className="divide-y divide-line border border-line bg-paper">
              {data.recentOrders.map((order) => (
                <li key={order.id}>
                  <Link href={`/admin/orders/${order.id}`} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3.5 transition-colors hover:bg-bone sm:px-5">
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="text-sm font-medium tabular-nums">{order.orderNumber}</span>
                      <span className="truncate text-xs text-subtle" dir="auto">
                        {order.customerName} · {order._count.items} item{order._count.items === 1 ? "" : "s"} · {dateTime(order.createdAt)}
                      </span>
                    </span>
                    <span className="text-sm tabular-nums">{formatMoney(String(order.total), order.currency)}</span>
                    <StatusBadge status={order.status} />
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="border border-dashed border-line px-5 py-8 text-center text-sm text-mute">No orders yet — they appear here as soon as customers check out.</p>
          )}
        </section>

        <section aria-labelledby="stock-heading" className="flex min-w-0 flex-col gap-4">
          <div className="flex items-baseline justify-between gap-3">
            <h2 id="stock-heading" className="eyebrow">
              Lowest stock
            </h2>
            <Link href="/admin/products" className="eyebrow !text-[0.625rem] text-mute hover:text-ink">
              Products →
            </Link>
          </div>
          {products.lowStockItems.length ? (
            <ul className="divide-y divide-line border border-line bg-paper">
              {products.lowStockItems.map((product) => (
                <li key={product.id}>
                  <Link href={`/admin/products/${product.id}`} className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-bone">
                    <span className="relative size-11 shrink-0 overflow-hidden bg-bone">
                      {product.image ? <SmartImage src={product.image} alt="" fill sizes="44px" className="object-cover" /> : null}
                    </span>
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate text-sm">{product.name}</span>
                      <span className="text-xs text-mute">{product.sku}</span>
                    </span>
                    <span className={cn("text-sm tabular-nums", product.stock === 0 ? "text-danger" : "text-gold-deep")}>{product.stock === 0 ? "Sold out" : `${product.stock} left`}</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="border border-dashed border-line px-5 py-8 text-center text-sm text-mute">Every live product has more than {LOW_STOCK_THRESHOLD} units in stock.</p>
          )}
        </section>
      </div>

      <section aria-label="Quick links" className="grid gap-px border border-line bg-line sm:grid-cols-2 xl:grid-cols-4">
        {[
          { href: "/admin/orders", title: "Orders", text: "Confirm, pack, ship and track customer orders." },
          { href: "/admin/products", title: "Products", text: "Create, edit, publish and archive products, variants and images." },
          { href: "/admin/categories", title: "Categories", text: "Departments, subcategories, ordering and visibility." },
          { href: "/admin/settings", title: "Settings", text: "WhatsApp and email credentials, contact details and notifications." },
        ].map((card) => (
          <Link key={card.href} href={card.href} className="group flex flex-col gap-2 bg-paper p-5 transition-colors hover:bg-bone sm:p-6">
            <span className="flex items-center justify-between font-display text-xl font-light">
              {card.title}
              <span aria-hidden="true" className="text-gold-deep transition-transform group-hover:translate-x-1">
                →
              </span>
            </span>
            <span className="text-sm text-subtle">{card.text}</span>
          </Link>
        ))}
      </section>

      <DiagnosticsPanel />
    </div>
  );
}
