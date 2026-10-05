"use client";

import Link from "@/i18n/Link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { departments, highlights } from "@/config/navigation";
import { ProductGrid, ProductGridSkeleton } from "@/components/product/ProductGrid";
import { Button } from "@/components/ui/Button";
import { Drawer } from "@/components/ui/Drawer";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { Icon } from "@/components/ui/Icon";
import { useLocale, useT } from "@/i18n/I18nProvider";
import { localizeHref } from "@/i18n/navigation";
import { useRecentSearches } from "./useRecentSearches";

const PREVIEW_LIMIT = 4;
const DEBOUNCE_MS = 250;
const SUGGESTIONS = [...departments, ...highlights].map(({ labelKey, href }) => ({ labelKey, href }));

/**
 * Search trigger + full-width overlay. Results come from GET /api/search, which
 * reads the catalogue data layer (MySQL).
 * Without JavaScript the form still submits to /search.
 */
export function SearchOverlay({ triggerClassName }) {
  const router = useRouter();
  const t = useT();
  const locale = useLocale();
  const inputRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [state, setState] = useState({ status: "idle", results: [], total: 0, categories: [] });
  const [attempt, setAttempt] = useState(0);
  const recent = useRecentSearches();

  const trimmed = query.trim();

  useEffect(() => {
    if (!open || trimmed.length < 2) return;

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setState((previous) => ({ ...previous, status: "loading" }));
      try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(trimmed)}&limit=${PREVIEW_LIMIT}&locale=${locale}`, {
          signal: controller.signal,
        });
        const payload = await response.json();
        if (!payload.ok) throw new Error(payload.error?.message);
        setState({ status: "done", results: payload.data.results, total: payload.data.total, categories: payload.data.categories ?? [] });
      } catch (error) {
        if (error.name !== "AbortError") setState({ status: "error", results: [], total: 0, categories: [] });
      }
    }, DEBOUNCE_MS);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [open, trimmed, attempt, locale]);

  function close() {
    setOpen(false);
  }

  function submit(event) {
    event.preventDefault();
    if (!trimmed) return;
    recent.add(trimmed);
    close();
    router.push(`${localizeHref("/search", locale)}?q=${encodeURIComponent(trimmed)}`);
  }

  const showResults = trimmed.length >= 2;

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} aria-label={t("search.title")} className={triggerClassName}>
        <Icon name="search" />
      </button>

      <Drawer open={open} onClose={close} label={t("search.title")} closeLabel={t("common.close")} side="top" className="max-h-dvh overflow-y-auto overscroll-contain">
        <div
          className="container-page pb-12 pt-6 sm:pb-16 sm:pt-10"
          onClick={(event) => {
            if (event.target.closest("a")) {
              if (trimmed) recent.add(trimmed);
              close();
            }
          }}
        >
          <form role="search" action={localizeHref("/search", locale)} onSubmit={submit} className="flex items-center gap-3 border-b border-ink pb-3 pe-12">
            <Icon name="search" className="size-6 text-mute" />
            <label htmlFor="site-search" className="sr-only">
              {t("search.label")}
            </label>
            <input
              ref={inputRef}
              id="site-search"
              name="q"
              type="search"
              autoFocus
              autoComplete="off"
              enterKeyHint="search"
              maxLength={80}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t("search.placeholder")}
              className="h-14 w-full min-w-0 bg-transparent font-display text-3xl font-light outline-none placeholder:text-mute/70 sm:text-4xl [&::-webkit-search-cancel-button]:hidden"
            />
            {query ? (
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  inputRef.current?.focus();
                }}
                className="eyebrow shrink-0 px-2 py-3 text-mute hover:text-ink"
              >
                {t("search.clear")}
              </button>
            ) : null}
          </form>

          <div className="pt-8 sm:pt-10" aria-live="polite">
            {!showResults ? (
              <div className="grid gap-10 sm:grid-cols-2">
                <section aria-labelledby="recent-searches">
                  <div className="mb-4 flex items-center justify-between">
                    <h2 id="recent-searches" className="eyebrow text-gold-deep">
                      {t("search.recent")}
                    </h2>
                    {recent.items.length ? (
                      <button type="button" onClick={recent.clear} className="eyebrow min-h-11 text-mute hover:text-ink">
                        {t("search.clearAll")}
                      </button>
                    ) : null}
                  </div>
                  {recent.items.length ? (
                    <ul className="flex flex-wrap gap-2">
                      {recent.items.map((term) => (
                        <li key={term}>
                          <button
                            type="button"
                            onClick={() => setQuery(term)}
                            className="inline-flex min-h-11 items-center gap-2 border border-line px-4 text-sm transition-colors hover:border-ink"
                          >
                            <Icon name="clock" className="size-4 text-mute" />
                            {term}
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-mute">{t("search.recentEmpty")}</p>
                  )}
                </section>

                <section aria-labelledby="search-suggestions">
                  <h2 id="search-suggestions" className="eyebrow mb-4 text-gold-deep">
                    {t("search.explore")}
                  </h2>
                  <ul className="flex flex-wrap gap-2">
                    {SUGGESTIONS.map((item) => (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          className="inline-flex min-h-11 items-center border border-line px-4 text-sm transition-colors hover:border-ink"
                        >
                          {t(item.labelKey)}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </section>
              </div>
            ) : state.status === "loading" || state.status === "idle" ? (
              <ProductGridSkeleton count={PREVIEW_LIMIT} className="xl:grid-cols-4" label={t("system.loadingProducts")} />
            ) : state.status === "error" ? (
              <ErrorState
                title={t("search.unavailable")}
                description={t("search.unavailableHint")}
                action={
                  <Button variant="secondary" size="sm" onClick={() => setAttempt((n) => n + 1)}>
                    {t("common.tryAgain")}
                  </Button>
                }
              />
            ) : state.results.length || state.categories.length ? (
              <div className="flex flex-col gap-8">
                {state.categories.length ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="eyebrow me-2 text-gold-deep">{t("search.categories")}</span>
                    {state.categories.map((category) => (
                      <Link key={category.slug} href={`/collections/${category.slug}`} className="inline-flex min-h-10 items-center border border-line px-4 text-sm transition-colors hover:border-ink">
                        {category.name}
                        {category.parent ? <span className="ms-2 text-xs text-mute">{category.parent}</span> : null}
                      </Link>
                    ))}
                  </div>
                ) : null}
                <div className="flex items-center justify-between gap-4">
                  <h2 className="eyebrow text-gold-deep">
                    {t(state.total === 1 ? "search.result" : "search.results", { count: state.total })}
                  </h2>
                  <Button href={`/search?q=${encodeURIComponent(trimmed)}`} variant="link" arrow>
                    {t("search.viewAll")}
                  </Button>
                </div>
                <ProductGrid products={state.results} />
              </div>
            ) : (
              <EmptyState
                icon="search"
                title={t("search.noResults", { query: trimmed })}
                description={t("search.noResultsHint")}
                action={
                  <div className="flex flex-wrap justify-center gap-2">
                    {departments.map((item) => (
                      <Button key={item.href} href={item.href} variant="secondary" size="sm">
                        {t(item.labelKey)}
                      </Button>
                    ))}
                  </div>
                }
              />
            )}
          </div>
        </div>
      </Drawer>
    </>
  );
}
