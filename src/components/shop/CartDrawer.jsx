"use client";

import { Button } from "@/components/ui/Button";
import { Drawer } from "@/components/ui/Drawer";
import { Icon } from "@/components/ui/Icon";
import { useT } from "@/i18n/I18nProvider";
import { CartLine } from "./CartLine";
import { CheckoutButton } from "./CheckoutButton";
import { Money } from "./Money";
import { useShop } from "./ShopProvider";

/** Slide-in bag (from the reading-end side). Opens after "Add to bag" and from the header. */
export function CartDrawer() {
  const t = useT();
  const shop = useShop();
  const { cart } = shop;
  const close = shop.closeDrawer;

  return (
    <Drawer open={shop.drawerOpen} onClose={close} label={t("cart.drawerTitle")} side="end" closeLabel={t("common.close")} className="sm:max-w-[28rem]">
      <div className="flex h-full flex-col">
        <header className="flex h-16 shrink-0 items-center gap-3 border-b border-line px-5 pe-16 sm:px-7">
          <h2 className="eyebrow">{t("cart.drawerTitle")}</h2>
          {cart.count ? <span className="text-xs tabular-nums text-mute">{t(cart.count === 1 ? "cart.item" : "cart.items", { count: cart.count })}</span> : null}
        </header>

        {cart.items.length ? (
          <>
            <ul className="flex-1 divide-y divide-line overflow-y-auto overscroll-contain px-5 sm:px-7">
              {cart.items.map((line) => (
                <CartLine key={line.id} line={line} compact onNavigate={close} />
              ))}
            </ul>

            <footer className="shrink-0 border-t border-line bg-paper px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-5 sm:px-7">
              <dl className="flex flex-col gap-2 text-sm">
                {cart.savings ? (
                  <div className="flex justify-between text-success">
                    <dt>{t("cart.savings")}</dt>
                    <dd>
                      <Money value={cart.savings} />
                    </dd>
                  </div>
                ) : null}
                <div className="flex items-baseline justify-between">
                  <dt className="eyebrow">{t("cart.subtotal")}</dt>
                  <dd className="text-end text-base font-medium">
                    <Money value={cart.subtotal} showBase />
                  </dd>
                </div>
              </dl>
              <p className="mt-1.5 text-xs text-mute">
                {t("cart.delivery")}: {t("cart.deliveryAtCheckout")}
              </p>
              <div className="mt-5 flex flex-col gap-2.5">
                <CheckoutButton hasIssues={cart.hasIssues} onNavigate={close} />
                <div className="grid grid-cols-2 gap-2.5">
                  <Button href="/cart" variant="secondary" size="sm" onClick={close}>
                    {t("cart.viewCart")}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={close} className="border border-line">
                    {t("cart.continue")}
                  </Button>
                </div>
              </div>
            </footer>
          </>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 px-8 text-center">
            <span className="grid size-14 place-items-center rounded-full border border-line">
              <Icon name="bag" className="size-6 text-gold-deep" />
            </span>
            <p className="headline text-title">{t("cart.empty")}</p>
            <p className="max-w-xs text-sm text-subtle">{shop.status === "error" ? t("cart.loadError") : t("cart.emptyText")}</p>
            <Button href="/collections/new-arrivals" arrow className="mt-3" onClick={close}>
              {t("cart.continue")}
            </Button>
          </div>
        )}
      </div>
    </Drawer>
  );
}
