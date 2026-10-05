// Page metadata builder: canonical URL, hreflang alternates, Open Graph and
// Twitter cards in one place. Paths are given unprefixed ("/collections/men");
// the locale prefix is applied here.
// Usage: export const metadata = createMetadata({ title: "Men", path: "/collections/men", locale });
import { siteConfig } from "@/config/site";
import { DEFAULT_LOCALE, LOCALES, SUPPORTED_LOCALES } from "@/i18n/config";
import { localizeHref } from "@/i18n/navigation";

export const DEFAULT_OG_IMAGE = {
  url: "/brand/og-default.jpg",
  width: 1200,
  height: 630,
  alt: `${siteConfig.name} — ${siteConfig.tagline}`,
};

/**
 * @param {{ title?: string, description?: string, path?: string, locale?: string, images?: Array<{url:string,width?:number,height?:number,alt?:string}>, noIndex?: boolean, type?: string }} options
 */
export function createMetadata({
  title,
  description = siteConfig.description,
  path = "/",
  locale = DEFAULT_LOCALE,
  images,
  noIndex = false,
  type = "website",
} = {}) {
  const ogImages = images?.length ? images : [DEFAULT_OG_IMAGE];
  const fullTitle = title ? `${title} | ${siteConfig.name}` : `${siteConfig.name} — ${siteConfig.tagline}`;
  const url = localizeHref(path, locale);

  return {
    ...(title && { title }),
    description,
    alternates: {
      canonical: url,
      // hreflang: every language version of this page, plus x-default (English).
      languages: {
        ...Object.fromEntries(SUPPORTED_LOCALES.map((code) => [LOCALES[code].htmlLang, localizeHref(path, code)])),
        "x-default": localizeHref(path, DEFAULT_LOCALE),
      },
    },
    openGraph: {
      type,
      siteName: siteConfig.name,
      locale: LOCALES[locale]?.htmlLang.replace("-", "_") ?? "en",
      url,
      title: fullTitle,
      description,
      images: ogImages,
    },
    twitter: {
      card: "summary_large_image",
      title: fullTitle,
      description,
      images: ogImages.map((image) => image.url),
    },
    ...(noIndex && { robots: { index: false, follow: true } }),
  };
}
