import { PageHeader } from "@/components/layout/PageHeader";
import { WishlistView } from "@/components/shop/WishlistView";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { getWishlistView } from "@/data/shop";
import { getTranslator } from "@/i18n/server";
import { localizeHref } from "@/i18n/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { createMetadata } from "@/utils/seo";

export async function generateMetadata({ params }) {
  const { locale } = await params;
  const t = await getTranslator(locale);
  return createMetadata({ title: t("wishlist.title"), path: "/wishlist", locale, noIndex: true });
}

// Per-customer page (reads the session) — rendered on every request.
export default async function WishlistPage({ params }) {
  const { locale } = await params;
  const [t, user] = await Promise.all([getTranslator(locale), getCurrentUser()]);
  const customer = user?.role === "CUSTOMER" ? user : null;
  const items = customer ? await getWishlistView(customer.id, { locale }) : [];
  const next = encodeURIComponent(localizeHref("/wishlist", locale));

  return (
    <>
      <PageHeader title={t("wishlist.title")} eyebrow={t("wishlist.eyebrow")} breadcrumbs={[{ label: t("wishlist.title") }]} homeLabel={t("breadcrumb.home")} breadcrumbLabel={t("breadcrumb.label")} />
      <section className="container-page section-y-sm">
        {customer ? (
          <WishlistView items={items} />
        ) : (
          <EmptyState
            icon="heart"
            title={t("wishlist.signInTitle")}
            description={t("wishlist.signInText")}
            action={
              <div className="flex flex-wrap justify-center gap-3">
                <Button href={`/login?next=${next}`}>{t("auth.signIn")}</Button>
                <Button href={`/register?next=${next}`} variant="secondary">
                  {t("auth.createAccount")}
                </Button>
              </div>
            }
          />
        )}
      </section>
    </>
  );
}
