import { AccessoriesSection } from "@/components/home/AccessoriesSection";
import { BrandStory } from "@/components/home/BrandStory";
import { CategorySwitcher } from "@/components/home/CategorySwitcher";
import { CollectionSection } from "@/components/home/CollectionSection";
import { Hero } from "@/components/home/Hero";
import { Lookbook } from "@/components/home/Lookbook";
import { ProductShowcase } from "@/components/home/ProductShowcase";
import { PromoBanner } from "@/components/home/PromoBanner";
import { siteConfig } from "@/config/site";
import { getHomeContent } from "@/content/home";
import { getBestSellers, getFeaturedProducts, getNewArrivals } from "@/data/catalog";
import { getTranslator } from "@/i18n/server";
import { getPublicContact } from "@/lib/settings";
import { createMetadata } from "@/utils/seo";

export async function generateMetadata({ params }) {
  const { locale } = await params;
  const t = await getTranslator(locale);
  return createMetadata({ path: "/", locale, description: `${siteConfig.name} — ${t("brand.tagline")}. ${t("home.hero.subtitle")}` });
}

// Catalogue data is re-read at most once a minute (ISR) — fast pages, fresh stock.
export const revalidate = 60;

function OrganizationJsonLd({ social }) {
  const data = [
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: siteConfig.name,
      url: siteConfig.url,
      logo: `${siteConfig.url}/brand/logo-full.png`,
      slogan: siteConfig.tagline,
      description: siteConfig.description,
      ...(social.length && { sameAs: social.map((item) => item.href) }),
    },
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: siteConfig.name,
      url: siteConfig.url,
      potentialAction: {
        "@type": "SearchAction",
        target: `${siteConfig.url}/search?q={search_term_string}`,
        "query-input": "required name=search_term_string",
      },
    },
  ];
  // JSON.stringify output is escaped for "<" to keep the script tag safe.
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
    />
  );
}

export default async function HomePage({ params }) {
  const { locale } = await params;
  const [t, newArrivals, featured, bestSellers] = await Promise.all([
    getTranslator(locale),
    getNewArrivals({ limit: 8, locale }),
    getFeaturedProducts({ limit: 4, locale }),
    getBestSellers({ limit: 4, locale }),
  ]);
  const content = getHomeContent(t);
  const { showcase } = content;
  const { social } = await getPublicContact();
  const instagram = social.find((item) => item.name === "Instagram");

  return (
    <>
      <OrganizationJsonLd social={social} />
      <Hero content={content.hero} />
      <CategorySwitcher items={content.departments.items} heading={content.departments.heading} shopLabel={content.departments.shopLabel} />
      <CollectionSection id="collection-men" content={content.featuredCollections.men} />
      <CollectionSection id="collection-women" content={content.featuredCollections.women} reverse tone="bone" />
      <ProductShowcase id="new-arrivals-title" content={showcase.newArrivals} empty={showcase.empty} products={newArrivals} />
      {/* Featured appears only when the team has flagged pieces (no empty rail). */}
      {featured.length ? <ProductShowcase id="featured-title" content={showcase.featured} empty={showcase.empty} products={featured} tone="bone" /> : null}
      <CollectionSection id="collection-kids" content={content.featuredCollections.kids} tone={featured.length ? "paper" : "bone"} />
      <AccessoriesSection content={content.accessoriesFeature} />
      {/* Best sellers appear once real sales (or flagged pieces) exist — never an empty rail. */}
      {bestSellers.length ? <ProductShowcase id="best-sellers-title" content={showcase.bestSellers} empty={showcase.empty} products={bestSellers} tone="bone" /> : null}
      <BrandStory content={content.brandStory} />
      <PromoBanner content={content.promo} />
      <Lookbook content={content.lookbook} socialLink={instagram} />
    </>
  );
}
