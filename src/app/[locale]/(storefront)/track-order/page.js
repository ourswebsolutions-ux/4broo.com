import { PageHeader } from "@/components/layout/PageHeader";
import { TrackOrder } from "@/components/order/TrackOrder";
import Link from "@/i18n/Link";
import { getTranslator } from "@/i18n/server";
import { createMetadata } from "@/utils/seo";

export async function generateMetadata({ params }) {
  const { locale } = await params;
  const t = await getTranslator(locale);
  return createMetadata({ title: t("tracking.title"), path: "/track-order", locale });
}

export default async function TrackOrderPage({ params }) {
  const t = await getTranslator((await params).locale);
  return (
    <>
      <PageHeader title={t("tracking.title")} eyebrow={t("tracking.eyebrow")} description={t("tracking.intro")} breadcrumbs={[{ label: t("tracking.title") }]} homeLabel={t("breadcrumb.home")} breadcrumbLabel={t("breadcrumb.label")} />
      <section className="container-page section-y-sm">
        <div className="mx-auto flex max-w-xl flex-col gap-10">
          <TrackOrder />
          <p className="border-t border-line pt-6 text-sm text-subtle">
            {t("tracking.signedIn")}{" "}
            <Link href="/account/orders" className="text-ink underline underline-offset-4">
              {t("account.orders")}
            </Link>
          </p>
        </div>
      </section>
    </>
  );
}
