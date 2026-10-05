import { CatalogResults } from "@/components/catalog/CatalogResults";
import { SearchField } from "@/components/search/SearchField";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { departments } from "@/config/navigation";
import { getSearchResults } from "@/data/catalog";
import { getTranslator } from "@/i18n/server";
import { createMetadata } from "@/utils/seo";

export async function generateMetadata({ params }) {
  const { locale } = await params;
  const t = await getTranslator(locale);
  return createMetadata({ title: t("search.title"), path: "/search", locale, noIndex: true });
}

/** Search results with the full filter / sort / pagination system (database-backed). */
export default async function SearchPage({ searchParams, params }) {
  const [query, { locale }] = await Promise.all([searchParams, params]);
  const t = await getTranslator(locale);
  const q = typeof query.q === "string" ? query.q.trim().slice(0, 80) : "";
  const result = q ? await getSearchResults({ locale, searchParams: new URLSearchParams(Object.entries(query).flatMap(([k, v]) => [].concat(v).map((item) => [k, item]))) }) : null;

  return (
    <>
      <section className="border-b border-line bg-paper">
        <div className="container-page flex flex-col gap-6 py-12 sm:py-16">
          <p className="eyebrow flex items-center gap-3 text-gold-deep">
            <span className="rule-gold" aria-hidden="true" />
            {q ? t("search.resultsFor", { query: q }) : t("search.findPiece")}
          </p>
          <h1 className="headline text-display-sm">{t("search.title")}</h1>
          <SearchField defaultValue={q} />
        </div>
      </section>

      <section aria-labelledby="search-results" className="container-page section-y-sm">
        <h2 id="search-results" className="sr-only">
          {t("search.title")}
        </h2>
        {!q ? (
          <EmptyState icon="search" title={t("search.prompt")} description={t("search.promptHint")} />
        ) : (
          <CatalogResults
            {...result}
            emptyTitle={t("search.noResults", { query: q })}
            emptyDescription={t("search.noResultsHint")}
            emptyAction={
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
      </section>
    </>
  );
}
