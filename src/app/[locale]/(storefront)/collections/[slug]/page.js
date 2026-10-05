import { CollectionView, collectionMetadata } from "@/components/catalog/CollectionView";

// Rendered per request from the URL (filters, sorting, page), so shared and
// refreshed URLs always show exactly the same results. Filtering runs in MySQL.
const queryOf = async (searchParams) => {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(await searchParams)) for (const item of [].concat(value)) params.append(key, item);
  return params.toString();
};

export async function generateMetadata({ params, searchParams }) {
  const [{ slug, locale }, query] = await Promise.all([params, queryOf(searchParams)]);
  return collectionMetadata({ slug, locale, query });
}

export default async function CollectionPage({ params, searchParams }) {
  const [{ slug, locale }, query] = await Promise.all([params, queryOf(searchParams)]);
  return <CollectionView slug={slug} locale={locale} query={query} />;
}
