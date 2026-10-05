import { OfflineNotice } from "@/components/common/OfflineNotice";
import { WhatsAppButton } from "@/components/common/WhatsAppButton";
import { AnnouncementBar } from "@/components/layout/AnnouncementBar";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { ShopProvider } from "@/components/shop/ShopProvider";
import { ToastProvider } from "@/components/ui/Toast";
import { WELCOME_GATE, WelcomeSplash } from "@/components/welcome/WelcomeSplash";
import { getTranslator } from "@/i18n/server";
import { getPublicContact } from "@/lib/settings";

export default async function StorefrontLayout({ children, params }) {
  const { locale } = await params;
  const [contact, t] = await Promise.all([getPublicContact(), getTranslator(locale)]);

  return (
    <ToastProvider dismissLabel={t("common.close")}>
      <ShopProvider>
        {/* Decides before first paint whether this visit gets the intro (once per session). */}
        <script dangerouslySetInnerHTML={{ __html: WELCOME_GATE }} />
        <WelcomeSplash skipLabel={t("welcome.skip")} />
        <a
          href="#main"
          className="eyebrow sr-only z-50 bg-gold px-4 py-3 text-ink focus:not-sr-only focus:fixed focus:start-4 focus:top-4"
        >
          {t("common.skipToContent")}
        </a>
        <AnnouncementBar message={t("announcement.message")} link={{ label: t("collection.shopNewArrivals"), href: "/collections/new-arrivals" }} />
        <SiteHeader contact={contact} locale={locale} />
        <main id="main" className="flex flex-1 flex-col">
          {children}
        </main>
        <SiteFooter contact={contact} locale={locale} />
        <WhatsAppButton number={contact.whatsappNumber} message={t("system.whatsappMessage")} label={t("system.whatsappLabel")} hoverLabel={t("system.whatsappHover")} />
        <OfflineNotice />
      </ShopProvider>
    </ToastProvider>
  );
}
