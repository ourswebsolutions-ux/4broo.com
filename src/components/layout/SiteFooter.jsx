import Link from "@/i18n/Link";
import { footerNavigation } from "@/config/navigation";
import { siteConfig } from "@/config/site";
import { Icon } from "@/components/ui/Icon";
import { Logo } from "@/components/ui/Logo";
import { getTranslator } from "@/i18n/server";

const SOCIAL_ICONS = { Instagram: "instagram", TikTok: "tiktok", Facebook: "facebook", YouTube: "youtube" };

/** @param {{ contact: Awaited<ReturnType<typeof import("@/lib/settings").getPublicContact>>, locale: string }} props  business contact from admin settings */
export async function SiteFooter({ contact, locale }) {
  const t = await getTranslator(locale);
  const year = new Date().getFullYear();

  return (
    <footer className="mt-auto bg-ink text-paper">
      <div className="container-page grid gap-14 pb-12 pt-16 sm:pt-20 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,3fr)] lg:gap-20 lg:pt-24">
        <div className="flex flex-col items-start gap-6">
          <Logo variant="full" className="h-28 sm:h-32" />
          <p className="max-w-xs text-sm leading-relaxed text-mist">
            {t("footer.about")}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-x-6 gap-y-12 sm:grid-cols-3 xl:grid-cols-5">
          {footerNavigation.map((column) => (
            <nav key={column.titleKey} aria-label={t(column.titleKey)}>
              <h2 className="eyebrow mb-5 text-gold">{t(column.titleKey)}</h2>
              <ul className="flex flex-col">
                {column.links.map((link) => (
                  <li key={`${column.titleKey}-${link.labelKey}`}>
                    <Link
                      href={link.href}
                      className="inline-flex min-h-9 items-center text-sm text-paper/75 transition-colors hover:text-paper"
                    >
                      {t(link.labelKey)}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}

          <div>
            <h2 className="eyebrow mb-5 text-gold">{t("footer.contact")}</h2>
            <ul className="flex flex-col gap-1 text-sm text-paper/75">
              {contact.email ? (
                <li>
                  <a href={`mailto:${contact.email}`} className="inline-flex min-h-9 items-center gap-2.5 [overflow-wrap:anywhere] hover:text-paper">
                    <Icon name="mail" className="size-4 text-gold" />
                    <bdi dir="ltr">{contact.email}</bdi>
                  </a>
                </li>
              ) : null}
              {contact.whatsappNumber ? (
                <li>
                  <a
                    href={`https://wa.me/${contact.whatsappNumber}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex min-h-9 items-center gap-2.5 hover:text-paper"
                  >
                    <Icon name="whatsapp" className="size-4 text-gold" />
                    WhatsApp
                  </a>
                </li>
              ) : null}
              {contact.phone ? (
                <li>
                  <a href={`tel:+${contact.phone}`} className="inline-flex min-h-9 items-center gap-2.5 hover:text-paper">
                    <Icon name="phone" className="size-4 text-gold" />
                    <bdi dir="ltr">+{contact.phone}</bdi>
                  </a>
                </li>
              ) : null}
              {contact.address ? (
                <li className="flex items-start gap-2.5 py-2">
                  <Icon name="mapPin" className="mt-0.5 size-4 shrink-0 text-gold" />
                  <address className="whitespace-pre-line not-italic">{contact.address}</address>
                </li>
              ) : null}
              {!contact.email && !contact.whatsappNumber && !contact.phone ? (
                <li>
                  <Link href="/contact" className="inline-flex min-h-9 items-center hover:text-paper">
                    {t("footer.contactUs")}
                  </Link>
                </li>
              ) : null}
            </ul>
            {contact.social.length ? (
              <ul className="mt-5 flex gap-1" aria-label={t("footer.social")}>
                {contact.social.map((item) => (
                  <li key={item.name}>
                    <a
                      href={item.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={t("footer.socialOn", { brand: contact.name ?? siteConfig.name, network: item.name })}
                      className="grid size-11 place-items-center text-paper/75 transition-colors hover:text-gold"
                    >
                      <Icon name={SOCIAL_ICONS[item.name]} />
                    </a>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </div>
      </div>

      <div className="border-t border-graphite">
        <div className="container-page flex flex-col gap-4 py-7 text-xs text-mist sm:flex-row sm:items-center sm:justify-between">
          <p>{t("footer.rights", { year, brand: contact.name ?? siteConfig.name })}</p>
          <p className="eyebrow !text-[0.625rem] text-gold">{t("brand.tagline")}</p>
        </div>
      </div>
    </footer>
  );
}
