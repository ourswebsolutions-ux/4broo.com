import { notFound } from "next/navigation";
import { siteConfig } from "@/config/site";
import { I18nProvider } from "@/i18n/I18nProvider";
import { LOCALES, SUPPORTED_LOCALES, isSupportedLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/server";
import { CurrencyProvider } from "@/components/currency/CurrencyProvider";
import { getExchangeRate } from "@/lib/currency/rates";
import { createMetadata } from "@/utils/seo";
import { fontVariables } from "../fonts";
import "../globals.css";

// Storefront root layout. Locales are part of the URL (/, /ur/…, /hi/…); the
// proxy maps unprefixed URLs to the English tree, so every page stays static.
// NOTE: no `dynamicParams = false` here — it would cascade to every child route
// and 404 on-demand ISR pages (products, DB categories). Unknown locales are
// rejected below with notFound(), and the proxy only routes en/ur/hi.

export function generateStaticParams() {
  return SUPPORTED_LOCALES.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }) {
  const { locale } = await params;
  return {
    ...createMetadata({ locale }),
    metadataBase: new URL(siteConfig.url),
    title: {
      default: `${siteConfig.name} — ${siteConfig.tagline}`,
      template: `%s | ${siteConfig.name}`,
    },
    applicationName: siteConfig.name,
    // Canonicals are set per page; the layout must not claim every page is the home page.
    alternates: undefined,
  };
}

export const viewport = {
  themeColor: "#0b0b0a",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default async function LocaleLayout({ children, params }) {
  const { locale } = await params;
  if (!isSupportedLocale(locale)) notFound();

  const config = LOCALES[locale];
  const [messages, usd] = await Promise.all([getDictionary(locale), getExchangeRate("PKR", "USD")]);
  const usdRate = usd?.rate ?? null;

  return (
    // suppressHydrationWarning: the welcome gate script sets data-welcome on <html> before hydration.
    <html lang={config.htmlLang} dir={config.dir} className={`${fontVariables} h-full`} suppressHydrationWarning>
      <body className="flex min-h-full flex-col">
        <I18nProvider locale={locale} messages={messages}>
          <CurrencyProvider available={usdRate ? ["PKR", "USD"] : ["PKR"]} usdRate={usdRate}>
            {children}
          </CurrencyProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
