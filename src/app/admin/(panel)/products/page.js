import Link from "next/link";
import { ProductRowActions } from "@/components/admin/products/ProductRowActions";
import { StatusBadge } from "@/components/admin/ui";
import { SmartImage } from "@/components/media/SmartImage";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Icon } from "@/components/ui/Icon";
import { requireAdmin } from "@/lib/auth/guards";
import { formatMoney } from "@/lib/currency/money";
import { listCategoriesForAdmin } from "@/services/categoryService";
import { listAdminProducts } from "@/services/productService";
import { cn } from "@/utils/cn";

export const metadata = { title: "Products" };

const STATUSES = [
  { value: "", label: "All" },
  { value: "PUBLISHED", label: "Published" },
  { value: "DRAFT", label: "Draft" },
  { value: "ARCHIVED", label: "Archived" },
];
const FLAG_LABELS = { featured: "Featured", newArrival: "New", bestSeller: "Best seller", onSale: "Sale" };

function hrefWith(current, changes) {
  const params = new URLSearchParams({ ...current, ...changes });
  for (const [key, value] of [...params]) if (!value || (key === "page" && value === "1")) params.delete(key);
  const query = params.toString();
  return `/admin/products${query ? `?${query}` : ""}`;
}

export default async function AdminProductsPage({ searchParams }) {
  await requireAdmin();
  const params = await searchParams;
  const current = {
    q: typeof params.q === "string" ? params.q.slice(0, 80) : "",
    status: STATUSES.some((s) => s.value === params.status) ? params.status : "",
    category: typeof params.category === "string" ? params.category.slice(0, 64) : "",
    page: String(Math.max(1, Number.parseInt(params.page ?? "1", 10) || 1)),
  };

  const [{ items, total, page, pageCount, statusCounts }, tree] = await Promise.all([
    listAdminProducts({ q: current.q || undefined, status: current.status || undefined, categoryId: current.category || undefined, page: Number(current.page) }),
    listCategoriesForAdmin(),
  ]);
  const allCount = Object.values(statusCounts).reduce((sum, n) => sum + n, 0);

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-2">
          <p className="eyebrow text-mute">Catalogue</p>
          <h1 className="font-display text-display-sm font-light">Products</h1>
        </div>
        <Button href="/admin/products/new">
          <Icon name="plus" className="size-4" />
          New product
        </Button>
      </header>

      {/* Status tabs */}
      <nav aria-label="Filter by status" className="-mb-2 flex gap-1 overflow-x-auto border-b border-line">
        {STATUSES.map((status) => {
          const count = status.value ? statusCounts[status.value] ?? 0 : allCount;
          const active = current.status === status.value;
          return (
            <Link
              key={status.label}
              href={hrefWith(current, { status: status.value, page: "1" })}
              aria-current={active ? "page" : undefined}
              className={cn("eyebrow -mb-px whitespace-nowrap border-b-2 px-4 py-3", active ? "border-ink text-ink" : "border-transparent text-mute hover:text-ink")}
            >
              {status.label} <span className="tabular-nums text-mute">({count})</span>
            </Link>
          );
        })}
      </nav>

      {/* Search + category filter (plain GET form — works without JS) */}
      <form method="get" action="/admin/products" className="flex flex-wrap items-end gap-3">
        {current.status ? <input type="hidden" name="status" value={current.status} /> : null}
        <label className="flex min-w-60 flex-1 flex-col gap-1.5 text-[0.8125rem] font-medium">
          Search
          <input name="q" type="search" defaultValue={current.q} placeholder="Name, slug or SKU" className="h-11 border border-line bg-paper px-3.5 font-normal outline-none focus:border-ink" />
        </label>
        <label className="flex min-w-52 flex-col gap-1.5 text-[0.8125rem] font-medium">
          Category
          <select name="category" defaultValue={current.category} className="h-11 border border-line bg-paper px-3 font-normal outline-none focus:border-ink">
            <option value="">All categories</option>
            {tree.map((department) => (
              <optgroup key={department.id} label={department.name}>
                <option value={department.id}>All {department.name}</option>
                {department.children.map((child) => (
                  <option key={child.id} value={child.id}>
                    {child.name}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </label>
        <Button type="submit" variant="secondary" size="sm" className="h-11">
          Apply
        </Button>
        {current.q || current.category ? (
          <Button href={hrefWith({ status: current.status }, {})} variant="link">
            Reset
          </Button>
        ) : null}
      </form>

      {items.length === 0 ? (
        allCount === 0 ? (
          <EmptyState icon="image" title="No products yet" description="Create your first product — it stays a draft until you publish it." action={<Button href="/admin/products/new">New product</Button>} />
        ) : (
          <EmptyState icon="search" title="No matching products" description="Try another search term, status or category." />
        )
      ) : (
        <>
        {/* Phones: one card per product */}
        <ul className="flex flex-col divide-y divide-line border border-line bg-paper md:hidden">
          {items.map((product) => {
            const image = product.images[0];
            const price = product.onSale && product.salePrice ? product.salePrice : product.price;
            return (
              <li key={product.id} className="flex gap-3 p-3">
                <Link href={`/admin/products/${product.id}`} className="relative aspect-[4/5] w-16 shrink-0 overflow-hidden bg-bone" aria-hidden="true" tabIndex={-1}>
                  {image ? <SmartImage src={image.url} alt="" fill sizes="64px" className="object-cover" /> : <Icon name="image" className="absolute inset-0 m-auto size-5 text-mute" />}
                </Link>
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <Link href={`/admin/products/${product.id}`} className="font-medium leading-snug hover:underline">
                    {product.name}
                  </Link>
                  <span className="truncate text-xs text-mute">
                    {[product.category.parent?.name, product.category.name].filter(Boolean).join(" / ")} · {product.sku ?? product.slug}
                  </span>
                  <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                    <span className="tabular-nums">{formatMoney(price.toString(), "PKR")}</span>
                    <span className={cn("text-xs tabular-nums", product.stock === 0 ? "text-danger" : product.stock <= 5 ? "text-gold-deep" : "text-subtle")}>
                      {product.stock === 0 ? "Sold out" : `${product.stock} in stock`}
                    </span>
                    <StatusBadge status={product.status} />
                  </span>
                </div>
                <ProductRowActions product={{ id: product.id, name: product.name, status: product.status, slug: product.slug, hasOrders: product._count.orderItems > 0 }} />
              </li>
            );
          })}
        </ul>
        <div className="hidden overflow-x-auto border border-line bg-paper md:block">
          <table className="w-full min-w-[56rem] text-sm">
            <thead>
              <tr className="border-b border-line text-start text-xs text-mute">
                <th scope="col" className="px-4 py-3 text-start font-medium">Product</th>
                <th scope="col" className="px-4 py-3 text-start font-medium">Category</th>
                <th scope="col" className="px-4 py-3 text-end font-medium">Price (PKR)</th>
                <th scope="col" className="px-4 py-3 text-end font-medium">Stock</th>
                <th scope="col" className="px-4 py-3 text-start font-medium">Status</th>
                <th scope="col" className="px-4 py-3 text-start font-medium">Flags</th>
                <th scope="col" className="px-4 py-3 text-end font-medium">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {items.map((product) => {
                const image = product.images[0];
                const flags = Object.keys(FLAG_LABELS).filter((flag) => product[flag]);
                return (
                  <tr key={product.id} className="border-b border-line last:border-0 hover:bg-bone/50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="relative size-14 shrink-0 overflow-hidden bg-bone">
                          {image ? <SmartImage src={image.url} alt="" fill sizes="56px" className="object-cover" /> : <Icon name="image" className="absolute inset-0 m-auto size-5 text-mute" />}
                        </div>
                        <div className="flex min-w-0 flex-col">
                          <Link href={`/admin/products/${product.id}`} className="truncate font-medium hover:underline">
                            {product.name}
                          </Link>
                          <span className="truncate text-xs text-mute">
                            {product.sku ?? product.slug} · {product._count.variants} variant{product._count.variants === 1 ? "" : "s"} · {product._count.images} image{product._count.images === 1 ? "" : "s"}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-subtle">
                      {[product.category.parent?.name, product.category.name].filter(Boolean).join(" / ")}
                    </td>
                    <td className="px-4 py-3 text-end tabular-nums">
                      {product.onSale && product.salePrice ? (
                        <div className="flex flex-col items-end">
                          <span>{formatMoney(product.salePrice.toString(), "PKR")}</span>
                          <s className="text-xs text-mute">{formatMoney(product.price.toString(), "PKR")}</s>
                        </div>
                      ) : (
                        formatMoney(product.price.toString(), "PKR")
                      )}
                    </td>
                    <td className={cn("px-4 py-3 text-end tabular-nums", product.stock === 0 ? "text-danger" : product.stock <= 5 ? "text-gold-deep" : "")}>
                      {product.stock}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={product.status} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {flags.length ? flags.map((flag) => (
                          <span key={flag} className="bg-bone px-1.5 py-0.5 text-[0.6875rem] text-subtle">
                            {FLAG_LABELS[flag]}
                          </span>
                        )) : <span className="text-xs text-mute">—</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-end">
                      <ProductRowActions product={{ id: product.id, name: product.name, status: product.status, slug: product.slug, hasOrders: product._count.orderItems > 0 }} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        </>
      )}

      {pageCount > 1 ? (
        <nav aria-label="Pagination" className="flex items-center justify-between gap-4">
          {page > 1 ? <Button href={hrefWith(current, { page: String(page - 1) })} variant="secondary" size="sm">Previous</Button> : <span />}
          <p className="text-sm text-mute">
            Page {page} of {pageCount} · {total} products
          </p>
          {page < pageCount ? <Button href={hrefWith(current, { page: String(page + 1) })} variant="secondary" size="sm">Next</Button> : <span />}
        </nav>
      ) : null}
    </div>
  );
}
