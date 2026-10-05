import { notFound } from "next/navigation";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { infoPages, INFO_PAGE_SLUGS } from "@/content/pages";
import { getTranslator } from "@/i18n/server";
import { formatMoney } from "@/lib/currency/money";
import { getPublicContact } from "@/lib/settings";
import { getShippingConfig } from "@/lib/shipping";
import { createMetadata } from "@/utils/seo";

// Catch-all: the information pages are prebuilt; any other unmatched storefront URL
// resolves to the branded, localised 404 (instead of the framework's bare one).
export const dynamicParams = true;
// Delivery-fee wording follows the server configuration; refresh hourly.
export const revalidate = 3600;

export function generateStaticParams() {
  return INFO_PAGE_SLUGS.map((page) => ({ page: [page] }));
}

const slugOf = (segments) => (segments?.length === 1 ? segments[0] : null);

export async function generateMetadata({ params }) {
  const { page: segments, locale } = await params;
  const page = slugOf(segments);
  if (!infoPages[page]) return {};
  const t = await getTranslator(locale);
  return createMetadata({ title: t(`pages.${page}.title`), description: t(`pages.${page}.intro`), path: `/${page}`, locale });
}

/** The delivery-fee sentence(s), from DELIVERY_FEE_PKR / FREE_DELIVERY_THRESHOLD_PKR. */
function feeText(t) {
  const { fee, freeThreshold } = getShippingConfig();
  if (fee === null) return t("pages.fee.tbc");
  const parts = [t("pages.fee.configured", { fee: formatMoney(fee, "PKR") })];
  if (freeThreshold !== null) parts.push(t("pages.fee.free", { threshold: formatMoney(freeThreshold, "PKR") }));
  return parts.join(" ");
}

function ContactChannels({ contact, t }) {
  const channels = [
    contact.email && { icon: "mail", label: t("pages.contactLabels.email"), value: contact.email, href: `mailto:${contact.email}`, ltr: true },
    contact.whatsappNumber && { icon: "whatsapp", label: t("pages.contactLabels.whatsapp"), value: t("pages.contactLabels.whatsappValue"), href: `https://wa.me/${contact.whatsappNumber}`, external: true },
    contact.phone && { icon: "phone", label: t("pages.contactLabels.phone"), value: `+${contact.phone}`, href: `tel:+${contact.phone}`, ltr: true },
  ].filter(Boolean);

  if (!channels.length && !contact.address) return <p className="text-sm text-subtle">{t("pages.contactLabels.none")}</p>;

  return (
    <div className="flex flex-col gap-4">
      {channels.length ? <ul className="grid gap-3 sm:grid-cols-2">
        {channels.map((channel) => (
          <li key={channel.label}>
            <a
              href={channel.href}
              {...(channel.external && { target: "_blank", rel: "noopener noreferrer" })}
              className="flex min-h-24 items-center gap-5 border border-line p-6 transition-colors duration-300 hover:border-ink"
            >
              <Icon name={channel.icon} className="size-6 shrink-0 text-gold-deep" />
              <span className="flex min-w-0 flex-col gap-1">
                <span className="eyebrow text-mute">{channel.label}</span>
                <span className="text-[0.9375rem] [overflow-wrap:anywhere]">{channel.ltr ? <bdi dir="ltr">{channel.value}</bdi> : channel.value}</span>
              </span>
            </a>
          </li>
        ))}
      </ul> : null}
      {contact.address ? (
        <div className="flex items-start gap-5 border border-line p-6">
          <Icon name="mapPin" className="size-6 shrink-0 text-gold-deep" />
          <span className="flex min-w-0 flex-col gap-1">
            <span className="eyebrow text-mute">{t("pages.contactLabels.address")}</span>
            <address className="whitespace-pre-line text-[0.9375rem] not-italic">{contact.address}</address>
          </span>
        </div>
      ) : null}
      <p className="text-xs text-mute">{t("pages.contactLabels.orderHelp")}</p>
    </div>
  );
}

export default async function InfoPage({ params }) {
  const { page: segments, locale } = await params;
  const page = slugOf(segments);
  const config = infoPages[page];
  if (!config) notFound();

  const t = await getTranslator(locale);
  const content = t(`pages.${page}`);
  const fee = config.usesFee ? feeText(t) : "";
  const fill = (text) => text.replace("{feeText}", fee);
  const contact = await getPublicContact();

  return (
    <>
      <PageHeader title={content.title} eyebrow={content.eyebrow} description={content.intro} breadcrumbs={[{ label: content.title }]} homeLabel={t("breadcrumb.home")} breadcrumbLabel={t("breadcrumb.label")} />

      <div className="container-narrow section-y-sm flex flex-col gap-12">
        {content.sections.map((section, index) => (
          <section key={section.h || index} className="flex flex-col gap-4">
            {section.h ? <h2 className="headline text-title">{section.h}</h2> : null}
            {section.p.map((paragraph) => (
              <p key={paragraph} className={page === "about" && index === 0 ? "text-base leading-relaxed text-subtle first:font-display first:text-2xl first:font-light first:leading-snug first:text-ink" : "text-[0.9375rem] leading-relaxed text-subtle"}>
                {fill(paragraph)}
              </p>
            ))}
          </section>
        ))}

        {config.contact ? <ContactChannels contact={contact} t={t} /> : null}
        {page !== "about" && page !== "contact" ? <p className="border-s-2 border-gold ps-5 text-sm leading-relaxed text-mute">{t("pages.updated")}</p> : null}

        <Button href="/collections/new-arrivals" variant="link" arrow className="self-start">
          {t("pages.continue")}
        </Button>
      </div>
    </>
  );
}
