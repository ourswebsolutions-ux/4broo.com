"use client";

import { usePathname, useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useCurrency } from "@/components/currency/CurrencyProvider";
import { ProductGrid } from "@/components/product/ProductGrid";
import { Button } from "@/components/ui/Button";
import { Drawer } from "@/components/ui/Drawer";
import { EmptyState } from "@/components/ui/EmptyState";
import { Icon } from "@/components/ui/Icon";
import { Spinner } from "@/components/ui/Spinner";
import { useT } from "@/i18n/I18nProvider";
import { countActiveFilters, EMPTY_STATE, serializeCatalogQuery, SORT_OPTIONS } from "@/lib/catalog/query";
import { formatMoney } from "@/lib/currency/money";
import { cn } from "@/utils/cn";
import { FilterPanel } from "./FilterPanel";

/**
 * Filterable, sortable, paginated product listing. All filtering happens in the
 * database: every change updates the URL (shareable, refresh-safe, back/forward
 * aware) and the server re-renders the results.
 */
export function CatalogResults({ state, facets, products, total, page, pageCount, salesData, usdRate, emptyAction, emptyTitle, emptyDescription }) {
  const t = useT();
  const router = useRouter();
  const pathname = usePathname();
  const { currency: preferredCurrency } = useCurrency();
  const [pending, startTransition] = useTransition();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [draft, setDraft] = useState(state);

  // Re-sync the mobile draft when the URL (server state) changes, e.g. back/forward.
  const stateKey = serializeCatalogQuery(state);
  const [draftKey, setDraftKey] = useState(stateKey);
  if (draftKey !== stateKey) {
    setDraftKey(stateKey);
    setDraft(state);
  }

  const displayCurrency = state.min || state.max ? state.currency : preferredCurrency;
  const navigate = (next) => startTransition(() => router.push(`${pathname}${serializeCatalogQuery(next)}`, { scroll: false }));
  const activeCount = countActiveFilters(state);

  const sorts = SORT_OPTIONS.filter((option) => option.value !== "bestSelling" || salesData || state.sort === "bestSelling");

  // Active filter chips (each removable).
  const chips = [
    ...state.sub.map((slug) => ({ key: `sub-${slug}`, label: facets.subcategories.find((s) => s.slug === slug)?.name ?? slug, remove: { sub: state.sub.filter((v) => v !== slug) } })),
    ...state.gender.map((g) => ({ key: `g-${g}`, label: t(`filters.genders.${g}`), remove: { gender: state.gender.filter((v) => v !== g) } })),
    ...state.size.map((s) => ({ key: `s-${s}`, label: `${t("filters.size")}: ${s}`, remove: { size: state.size.filter((v) => v !== s) } })),
    ...state.color.map((c) => ({ key: `c-${c}`, label: facets.colors.find((x) => x.name.toLowerCase() === c)?.name ?? c.replace(/^\p{L}/u, (ch) => ch.toUpperCase()), remove: { color: state.color.filter((v) => v !== c) } })),
    ...(state.min || state.max
      ? [{ key: "price", label: `${state.min ? formatMoney(state.min, state.currency) : "0"} – ${state.max ? formatMoney(state.max, state.currency) : "∞"}`, remove: { min: "", max: "" }, ltr: true }]
      : []),
    ...state.material.map((m) => ({ key: `m-${m}`, label: m, remove: { material: state.material.filter((v) => v !== m) } })),
    ...(state.inStock ? [{ key: "stock", label: t("filters.inStock"), remove: { inStock: false } }] : []),
    ...state.flags.map((f) => ({ key: `f-${f}`, label: t({ sale: "filters.onSale", new: "filters.newArrival", best: "filters.bestSeller", featured: "filters.featured" }[f]), remove: { flags: state.flags.filter((v) => v !== f) } })),
  ];
  const clearAll = () => navigate({ ...EMPTY_STATE, q: state.q, sort: state.sort });

  const sortSelect = (
    <label className="flex items-center gap-2 text-sm">
      <span className="eyebrow hidden text-mute sm:inline">{t("sort.label")}</span>
      <span className="sr-only sm:hidden">{t("sort.label")}</span>
      <span className="relative">
        <select
          value={state.sort}
          onChange={(event) => navigate({ ...state, sort: event.target.value, page: 1 })}
          className="h-11 appearance-none border border-line bg-paper pe-9 ps-3.5 text-sm outline-none transition-colors hover:border-ink focus:border-ink"
        >
          {sorts.map((option) => (
            <option key={option.value} value={option.value}>
              {t(`sort.${option.value}`)}
            </option>
          ))}
        </select>
        <Icon name="chevronDown" className="pointer-events-none absolute end-3 top-1/2 size-4 -translate-y-1/2 text-mute" />
      </span>
    </label>
  );

  const pageHref = (target) => `${pathname}${serializeCatalogQuery({ ...state, page: target })}`;

  return (
    <div className="grid gap-10 lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-12 xl:grid-cols-[17rem_minmax(0,1fr)]">
      {/* Desktop filter sidebar */}
      <aside aria-label={t("filters.title")} className="hidden lg:block">
        <div className="sticky top-28 max-h-[calc(100dvh-8rem)] overflow-y-auto overscroll-contain pe-2 scrollbar-none">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="eyebrow text-gold-deep">{t("filters.title")}</h2>
            {activeCount ? (
              <button type="button" onClick={clearAll} className="text-xs text-mute underline-offset-4 hover:text-ink hover:underline">
                {t("filters.clearAll")}
              </button>
            ) : null}
          </div>
          <FilterPanel state={state} facets={facets} onChange={navigate} displayCurrency={displayCurrency} usdRate={usdRate} />
        </div>
      </aside>

      <div className="min-w-0">
        {/* Toolbar */}
        <div className="sticky top-16 z-20 -mx-[clamp(1rem,4vw,3.5rem)] flex items-center justify-between gap-3 border-b border-line bg-paper/95 px-[clamp(1rem,4vw,3.5rem)] py-3 backdrop-blur-sm lg:static lg:mx-0 lg:border-0 lg:bg-transparent lg:px-0 lg:py-0 lg:backdrop-blur-none">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setSheetOpen(true)}
              aria-label={t("filters.open")}
              className="inline-flex h-11 items-center gap-2.5 border border-ink px-4 text-sm transition-colors hover:bg-ink hover:text-paper lg:hidden"
            >
              <Icon name="menu" className="size-4" />
              {t("filters.title")}
              {activeCount ? <span className="grid size-5 place-items-center rounded-full bg-gold text-[0.6875rem] tabular-nums text-ink">{activeCount}</span> : null}
            </button>
            <p className="text-sm text-subtle" aria-live="polite" aria-atomic="true">
              {pending ? (
                <span className="inline-flex items-center gap-2">
                  <Spinner /> {t("filters.updating")}
                </span>
              ) : (
                t(total === 1 ? "search.result" : "search.results", { count: total })
              )}
            </p>
          </div>
          {sortSelect}
        </div>

        {/* Active filter chips */}
        {chips.length ? (
          <div className="mt-5 flex flex-wrap items-center gap-2" aria-label={t("filters.active")} role="group">
            {chips.map((chip) => (
              <button
                key={chip.key}
                type="button"
                onClick={() => navigate({ ...state, ...chip.remove, page: 1 })}
                aria-label={t("filters.remove", { label: chip.label })}
                className="group/chip inline-flex h-9 animate-[fade_300ms_ease-out] items-center gap-2 border border-line bg-paper px-3 text-xs transition-colors hover:border-ink"
              >
                {chip.ltr ? <bdi dir="ltr">{chip.label}</bdi> : chip.label}
                <Icon name="close" className="size-3.5 text-mute transition-colors group-hover/chip:text-ink" />
              </button>
            ))}
            <button type="button" onClick={clearAll} className="h-9 px-2 text-xs text-mute underline underline-offset-4 hover:text-ink">
              {t("filters.clearAll")}
            </button>
          </div>
        ) : null}

        {/* Results */}
        <div aria-busy={pending} className={cn("mt-8 transition-opacity duration-300", pending && "pointer-events-none opacity-45")}>
          {products.length ? (
            <ProductGrid products={products} preloadFirst={4} className="xl:grid-cols-3 2xl:grid-cols-4" />
          ) : (
            <EmptyState
              icon="search"
              title={activeCount ? t("filters.noResults") : (emptyTitle ?? t("collection.arrivingSoon"))}
              description={activeCount ? t("filters.noResultsHint") : (emptyDescription ?? t("collection.arrivingSoonText"))}
              action={
                activeCount ? (
                  <Button variant="secondary" size="sm" onClick={clearAll}>
                    {t("filters.clearAll")}
                  </Button>
                ) : (
                  emptyAction
                )
              }
            />
          )}
        </div>

        {pageCount > 1 ? (
          <nav aria-label={t("collection.pagination")} className="mt-16 flex items-center justify-between gap-4 border-t border-line pt-8">
            {page > 1 ? (
              <Button href={pageHref(page - 1)} variant="secondary" size="sm" rel="prev" scroll={false}>
                {t("collection.previousPage")}
              </Button>
            ) : (
              <span />
            )}
            <p className="eyebrow text-mute">{t("collection.pageOf", { page, total: pageCount })}</p>
            {page < pageCount ? (
              <Button href={pageHref(page + 1)} variant="secondary" size="sm" rel="next">
                {t("collection.nextPage")}
              </Button>
            ) : (
              <span />
            )}
          </nav>
        ) : null}
      </div>

      {/* Mobile filter sheet: edits a draft, applied in one navigation */}
      <Drawer open={sheetOpen} onClose={() => setSheetOpen(false)} label={t("filters.title")} side="end" closeLabel={t("common.close")}>
        <div className="flex h-full flex-col">
          <div className="flex h-16 shrink-0 items-center gap-3 border-b border-line px-5 pe-16">
            <h2 className="eyebrow">{t("filters.title")}</h2>
            {countActiveFilters(draft) ? <span className="text-xs text-mute">{t("filters.selected", { count: countActiveFilters(draft) })}</span> : null}
          </div>
          <div className="flex-1 overflow-y-auto overscroll-contain px-5">
            <FilterPanel state={draft} facets={facets} onChange={setDraft} displayCurrency={displayCurrency} usdRate={usdRate} />
          </div>
          <div className="flex shrink-0 gap-3 border-t border-line bg-paper px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4">
            <Button variant="secondary" className="flex-1" onClick={() => setDraft({ ...EMPTY_STATE, q: state.q, sort: state.sort })}>
              {t("filters.clearAll")}
            </Button>
            <Button
              className="flex-[1.4]"
              onClick={() => {
                setSheetOpen(false);
                navigate({ ...draft, page: 1 });
              }}
            >
              {t("filters.apply")}
            </Button>
          </div>
        </div>
      </Drawer>
    </div>
  );
}
