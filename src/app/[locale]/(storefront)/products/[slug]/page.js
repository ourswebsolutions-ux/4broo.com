import { notFound } from "next/navigation";
import { cache } from "react";
import { getProductBadges, ProductBadge } from "@/components/product/ProductBadge";
import { FavoriteButton } from "@/components/product/FavoriteButton";
import { ProductGallery } from "@/components/product/ProductGallery";
import { ProductGrid } from "@/components/product/ProductGrid";
import { ProductPurchasePanel } from "@/components/product/ProductPurchasePanel";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { siteConfig } from "@/config/site";
import { getProductDetail, getRelatedProducts } from "@/data/catalog";
import Link from "@/i18n/Link";
import { localizeHref } from "@/i18n/navigation";
import { getTranslator } from "@/i18n/server";
import { getPublicContact } from "@/lib/settings";
import { createMetadata } from "@/utils/seo";

// Rendered on first request, then cached and revalidated every minute (ISR).
export const dynamicParams = true;
export const revalidate = 60;

const loadProduct = cache((slug, locale) => getProductDetail(slug, { locale }));

export function generateStaticParams() {
  return [];
}

export async function generateMetadata({ params }) {
  const { slug, locale } = await params;
  const product = await loadProduct(slug, locale);
  if (!product) return {};
  const image = product.images[0];
  return createMetadata({
    title: product.seo.title ?? product.name,
    description: product.seo.description ?? product.shortDescription ?? undefined,
    path: product.href,
    locale,
    type: "website",
    images: image ? [{ url: image.src, width: image.width, height: image.height, alt: image.alt }] : undefined,
  });
}

/** schema.org Product with a PKR offer — only for real catalogue data. */
function ProductJsonLd({ product, locale }) {
  const prices = product.variants.length ? product.variants.map((variant) => Number(variant.price.amount)) : [Number(product.price.amount)];
  const inStock = product.stock.status !== "out_of_stock";
  const data = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.seo.description ?? product.shortDescription ?? product.description ?? undefined,
    image: product.images.map((image) => image.src),
    sku: product.sku ?? product.variants[0]?.sku,
    brand: { "@type": "Brand", name: siteConfig.name },
    ...(product.material && { material: product.material }),
    ...(product.category && { category: product.category.name }),
    offers: {
      "@type": "AggregateOffer",
      priceCurrency: product.price.currency,
      lowPrice: Math.min(...prices).toFixed(2),
      highPrice: Math.max(...prices).toFixed(2),
      offerCount: Math.max(1, product.variants.length),
      availability: inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      url: `${siteConfig.url}${localizeHref(product.href, locale)}`,
    },
  };
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }} />;
}

export default async function ProductPage({ params }) {
  const { slug, locale } = await params;
  const [product, t] = await Promise.all([loadProduct(slug, locale), getTranslator(locale)]);
  if (!product) notFound();
  const related = await getRelatedProducts(product, { limit: 4, locale });

  const { whatsappNumber } = await getPublicContact();
  const badges = getProductBadges(product, t);
  const crumbs = [
    product.category?.parent && { label: product.category.parent.name, href: `/collections/${product.category.parent.slug}` },
    product.category && { label: product.category.name, href: `/collections/${product.category.slug}` },
  ].filter(Boolean);

  return (
    <>
      <ProductJsonLd product={product} locale={locale} />

      <div className="container-page pt-6 sm:pt-8">
        <nav aria-label={t("breadcrumb.label")}>
          <ol className="flex flex-wrap items-center gap-2 text-xs text-mute">
            <li>
              <Link href="/" className="inline-block py-2 hover:underline">
                {t("breadcrumb.home")}
              </Link>
            </li>
            {crumbs.map((crumb) => (
              <li key={crumb.href} className="flex items-center gap-2">
                <span aria-hidden="true">/</span>
                <Link href={crumb.href} className="inline-block py-2 hover:underline">
                  {crumb.label}
                </Link>
              </li>
            ))}
          </ol>
        </nav>
      </div>

      <div className="container-page grid gap-10 pb-16 pt-4 sm:pb-24 lg:grid-cols-12 lg:gap-14">
        <div className="lg:col-span-7">
          <ProductGallery images={product.images} productName={product.name} />
        </div>

        <div className="lg:col-span-5">
          <div className="flex flex-col gap-8 lg:sticky lg:top-28">
            <header className="flex flex-col gap-4">
              {badges.length ? (
                <div className="flex flex-wrap gap-1.5">
                  {badges.map((badge) => (
                    <ProductBadge key={badge.variant} variant={badge.variant} className={badge.variant === "new" ? "border border-line" : ""}>
                      {badge.label}
                    </ProductBadge>
                  ))}
                </div>
              ) : null}
              {product.category ? <p className="eyebrow text-gold-deep">{product.category.name}</p> : null}
              <div className="flex items-start justify-between gap-4">
                <h1 className="headline text-display-sm">{product.name}</h1>
                <FavoriteButton productId={product.id} productName={product.name} className="-me-2 shrink-0" />
              </div>
              {product.shortDescription ? <p dir="auto" className="text-[0.9375rem] leading-relaxed text-subtle">{product.shortDescription}</p> : null}
            </header>

            <ProductPurchasePanel product={product} whatsappNumber={whatsappNumber} />

            {product.description || product.material ? (
              <section aria-labelledby="product-details" className="flex flex-col gap-4 border-t border-line pt-6">
                <h2 id="product-details" className="eyebrow">
                  {t("product.details")}
                </h2>
                {product.description ? (
                  <div dir="auto" className="whitespace-pre-line text-[0.9375rem] leading-relaxed text-subtle">{product.description}</div>
                ) : null}
                <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
                  {product.material ? (
                    <>
                      <dt className="text-mute">{t("product.material")}</dt>
                      <dd dir="auto">{product.material}</dd>
                    </>
                  ) : null}
                  {product.category ? (
                    <>
                      <dt className="text-mute">{t("product.category")}</dt>
                      <dd>{[product.category.parent?.name, product.category.name].filter(Boolean).join(" / ")}</dd>
                    </>
                  ) : null}
                </dl>
              </section>
            ) : null}
          </div>
        </div>
      </div>

      {related.length ? (
        <section aria-labelledby="related-title" className="border-t border-line bg-paper">
          <div className="container-page section-y flex flex-col gap-10">
            <SectionHeading
              id="related-title"
              eyebrow={t("product.related")}
              title={product.category?.parent?.name ?? product.category?.name ?? t("product.related")}
              action={product.category ? { label: t("product.relatedMore", { category: product.category.name }), href: `/collections/${product.category.slug}` } : undefined}
            />
            <ProductGrid products={related} />
          </div>
        </section>
      ) : null}
    </>
  );
}
