import { Suspense } from "react";
import { CurrencyMenu } from "@/components/currency/CurrencyMenu";
import { LanguageMenu } from "@/components/layout/LanguageMenu";
import { Icon } from "@/components/ui/Icon";
import { Logo } from "@/components/ui/Logo";
import { siteConfig } from "@/config/site";
import Link from "@/i18n/Link";
import { getTranslator } from "@/i18n/server";

// Distraction-free checkout shell: brand, reassurance, language & currency — no shop navigation.
export default async function CheckoutLayout({ children, params }) {
  const t = await getTranslator((await params).locale);

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-graphite bg-ink text-paper">
        <div className="container-page flex h-16 items-center justify-between gap-4 lg:h-20">
          <div className="flex items-center gap-5">
            <Logo preload className="h-10 lg:h-12" />
            <span aria-hidden="true" className="hidden h-6 w-px bg-graphite sm:block" />
            <p className="eyebrow hidden items-center gap-2 !text-[0.625rem] text-mist sm:flex">
              <Icon name="lock" className="size-3.5 text-gold" />
              {t("checkout.secure")}
            </p>
          </div>
          <div className="-me-2 flex items-center">
            <Suspense fallback={null}>
              <LanguageMenu compact />
            </Suspense>
            <CurrencyMenu />
          </div>
        </div>
      </header>
      <main id="main" className="flex flex-1 flex-col bg-paper">
        {children}
      </main>
      <footer className="border-t border-line bg-paper">
        <div className="container-page flex flex-col gap-3 py-6 text-xs text-mute sm:flex-row sm:items-center sm:justify-between">
          <p>{t("footer.rights", { year: new Date().getFullYear(), brand: siteConfig.name })}</p>
          <nav aria-label={t("footer.columns.help")} className="flex flex-wrap gap-x-5 gap-y-1">
            <Link href="/terms" className="hover:text-ink">{t("footer.links.terms")}</Link>
            <Link href="/privacy-policy" className="hover:text-ink">{t("footer.links.privacy")}</Link>
            <Link href="/shipping" className="hover:text-ink">{t("footer.links.shipping")}</Link>
            <Link href="/contact" className="hover:text-ink">{t("footer.links.contact")}</Link>
          </nav>
        </div>
      </footer>
    </>
  );
}
