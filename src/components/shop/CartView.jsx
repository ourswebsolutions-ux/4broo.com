"use client";

import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { LoadingState } from "@/components/ui/LoadingState";
import { useLocale, useT } from "@/i18n/I18nProvider";
import { localizeHref } from "@/i18n/navigation";
import { CartLine } from "./CartLine";
import { CheckoutButton } from "./CheckoutButton";
import { Money } from "./Money";
import { SavedList } from "./SavedList";
import { useShop } from "./ShopProvider";

function SignInCallout() {
  const t = useT();
  const next = encodeURIComponent(localizeHref("/cart", useLocale()));
  return (
    <EmptyState
      icon="bag"
      title={t("cart.signInTitle")}
      description={t("cart.signInText")}
      action={
        <div className="flex flex-wrap justify-center gap-3">
          <Button href={`/login?next=${next}`}>{t("auth.signIn")}</Button>
          <Button href={`/register?next=${next}`} variant="secondary">
            {t("auth.createAccount")}
          </Button>
        </div>
      }
    />
  );
}

/** Order summary — every figure is the server's (PKR canonical, USD display only). */
function Summary({ cart }) {
  const t = useT();
  return (
    <aside aria-labelledby="summary-title" className="flex flex-col gap-6 border border-line bg-paper p-6 sm:p-8 lg:sticky lg:top-28">
      <h2 id="summary-title" className="eyebrow">
        {t("cart.summary")}
      </h2>
      <dl className="flex flex-col gap-3.5 text-sm">
        <div className="flex justify-between gap-4">
          <dt className="text-subtle">{t("cart.subtotal")}</dt>
          <dd>
            <Money value={cart.subtotal} />
          </dd>
        </div>
        {cart.savings ? (
          <div className="flex justify-between gap-4 text-success">
            <dt>{t("cart.savings")}</dt>
            <dd>
              <Money value={cart.savings} />
            </dd>
          </div>
        ) : null}
        <div className="flex justify-between gap-4">
          <dt className="text-subtle">{t("cart.delivery")}</dt>
          <dd className="text-end text-subtle">{t("cart.deliveryAtCheckout")}</dd>
        </div>
        <div className="mt-2 flex items-baseline justify-between gap-4 border-t border-line pt-5">
          <dt className="eyebrow">{t("cart.estimatedTotal")}</dt>
          <dd className="text-end text-xl font-medium">
            <Money value={cart.subtotal} showBase />
          </dd>
        </div>
      </dl>
      <CheckoutButton hasIssues={cart.hasIssues} />
      <p className="text-xs leading-relaxed text-mute">{t("cart.chargedNote")}</p>
    </aside>
  );
}

/** Shopping bag page body (client: reads the session's shop state). */
export function CartView() {
  const t = useT();
  const shop = useShop();
  const { cart, saved } = shop;

  if (shop.status === "loading") return <LoadingState label={t("common.loading")} />;
  if (!shop.user) return <SignInCallout />;

  return (
    <div className="flex flex-col gap-20">
      {cart.items.length ? (
        <div className="grid items-start gap-10 lg:grid-cols-[minmax(0,1fr)_24rem] lg:gap-16">
          <section aria-labelledby="bag-title">
            <div className="flex items-baseline justify-between border-b border-ink pb-4">
              <h2 id="bag-title" className="eyebrow">
                {t(cart.count === 1 ? "cart.item" : "cart.items", { count: cart.count })}
              </h2>
              <Button href="/collections/new-arrivals" variant="link">
                {t("cart.continue")}
              </Button>
            </div>
            <ul className="divide-y divide-line border-b border-line">
              {cart.items.map((line) => (
                <CartLine key={line.id} line={line} />
              ))}
            </ul>
          </section>
          <Summary cart={cart} />
        </div>
      ) : (
        <EmptyState
          icon="bag"
          title={t("cart.empty")}
          description={shop.status === "error" ? t("cart.loadError") : t("cart.emptyText")}
          action={
            <Button href="/collections/new-arrivals" arrow>
              {t("cart.continue")}
            </Button>
          }
        />
      )}

      {saved.length ? (
        <section aria-labelledby="saved-title" className="flex flex-col gap-8">
          <div className="flex items-baseline justify-between border-b border-ink pb-4">
            <h2 id="saved-title" className="headline text-title">
              {t("saved.title")}
            </h2>
            <span className="text-xs text-mute">{t("saved.count", { count: saved.length })}</span>
          </div>
          <SavedList items={saved} />
        </section>
      ) : null}
    </div>
  );
}
