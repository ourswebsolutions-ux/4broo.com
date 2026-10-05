import { PageHeader } from "@/components/layout/PageHeader";
import { CartView } from "@/components/shop/CartView";
import { getTranslator } from "@/i18n/server";
import { createMetadata } from "@/utils/seo";

export async function generateMetadata({ params }) {
  const { locale } = await params;
  const t = await getTranslator(locale);
  return createMetadata({ title: t("cart.title"), path: "/cart", locale, noIndex: true });
}

// Static shell; the bag itself is per-customer and loads client-side from the session.
export default async function CartPage({ params }) {
  const { locale } = await params;
  const t = await getTranslator(locale);
  return (
    <>
      <PageHeader title={t("cart.title")} eyebrow={t("cart.eyebrow")} breadcrumbs={[{ label: t("cart.title") }]} homeLabel={t("breadcrumb.home")} breadcrumbLabel={t("breadcrumb.label")} />
      <section className="container-page section-y-sm">
        <CartView />
      </section>
    </>
  );
}
