import { notFound } from "next/navigation";
import { cache } from "react";
import { SmartImage } from "@/components/media/SmartImage";
import { Button } from "@/components/ui/Button";
import { getCollection } from "@/data/catalog";
import Link from "@/i18n/Link";
import { getTranslator } from "@/i18n/server";
import { createMetadata } from "@/utils/seo";
import { CatalogResults } from "./CatalogResults";

export const loadCollection = cache((slug, locale, query) => getCollection(slug, { locale, searchParams: new URLSearchParams(query) }));

export async function collectionMetadata({ slug, locale, query }) {
  const result = await loadCollection(slug, locale, query);
  if (!result) return {};
  const { collection, state } = result;
  const filtered = query.length > 0;
  return createMetadata({
    title: state.page > 1 ? `${collection.title} — ${state.page}` : collection.title,
    description: collection.description || undefined,
    path: `/collections/${slug}`,
    locale,
    // Canonical stays on the unfiltered page; filtered permutations are not indexed.
    noIndex: filtered,
  });
}

/** Editorial category banner + database-driven filterable product listing. */
export async function CollectionView({ slug, locale, query }) {
  const [result, t] = await Promise.all([loadCollection(slug, locale, query), getTranslator(locale)]);
  if (!result) notFound();

  const { collection, state, facets, products, total, page, pageCount, salesData, usdRate } = result;
  const subNav = facets.subcategories;

  return (
    <>
      <section className="relative isolate overflow-hidden bg-ink text-paper">
        {collection.image ? (
          <div className="absolute inset-0 -z-10">
            <SmartImage src={collection.image.src} alt="" fill preload sizes="100vw" className="parallax-media object-cover object-[50%_30%] opacity-55" />
            <div className="absolute inset-0 bg-ink/35" />
          </div>
        ) : null}
        <div className="container-page flex min-h-[19rem] flex-col justify-end gap-5 pb-10 pt-14 sm:min-h-[24rem] sm:pb-14 lg:min-h-[28rem]">
          <nav aria-label={t("breadcrumb.label")}>
            <ol className="flex flex-wrap items-center gap-2 text-xs text-paper/70">
              <li>
                <Link href="/" className="inline-block py-2 hover:underline">
                  {t("breadcrumb.home")}
                </Link>
              </li>
              {collection.parent ? (
                <li className="flex items-center gap-2">
                  <span aria-hidden="true">/</span>
                  <Link href={`/collections/${collection.parent.slug}`} className="inline-block py-2 hover:underline">
                    {collection.parent.name}
                  </Link>
                </li>
              ) : null}
              <li className="flex items-center gap-2">
                <span aria-hidden="true">/</span>
                <span aria-current="page">{collection.title}</span>
              </li>
            </ol>
          </nav>
          <p className="eyebrow flex animate-reveal items-center gap-3 text-gold">
            <span className="rule-gold" aria-hidden="true" />
            {collection.eyebrow}
          </p>
          <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <h1 className="headline animate-reveal text-display [animation-delay:80ms]">{collection.title}</h1>
            <p className="eyebrow tabular-nums text-paper/70">{t(total === 1 ? "collection.piece" : "collection.pieces", { count: total })}</p>
          </div>
          {collection.description ? <p className="max-w-xl animate-reveal text-[0.9375rem] leading-relaxed text-paper/75 [animation-delay:160ms]">{collection.description}</p> : null}
          {subNav.length ? (
            <ul className="scrollbar-none -mx-[clamp(1rem,4vw,3.5rem)] mt-2 flex gap-2 overflow-x-auto px-[clamp(1rem,4vw,3.5rem)]">
              {subNav.map((sub) => (
                <li key={sub.slug} className="shrink-0">
                  <Button href={`/collections/${sub.slug}`} variant="outline-light" size="sm">
                    {sub.name}
                  </Button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </section>

      <section aria-labelledby="collection-products" className="container-page section-y-sm">
        <h2 id="collection-products" className="sr-only">
          {collection.title}
        </h2>
        <CatalogResults
          state={state}
          facets={facets}
          products={products}
          total={total}
          page={page}
          pageCount={pageCount}
          salesData={salesData}
          usdRate={usdRate}
          emptyAction={
            <Button href="/collections/new-arrivals" arrow>
              {t("collection.shopNewArrivals")}
            </Button>
          }
        />
      </section>
    </>
  );
}
