"use client";

import { SavedList } from "@/components/shop/SavedList";
import { useShop } from "@/components/shop/ShopProvider";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { LoadingState } from "@/components/ui/LoadingState";
import { useT } from "@/i18n/I18nProvider";

/** Saved-for-later items from the session's shop state (kept in sync with the bag). */
export function SavedView() {
  const t = useT();
  const shop = useShop();
  if (shop.status === "loading") return <LoadingState label={t("common.loading")} />;
  if (!shop.saved.length) {
    return (
      <EmptyState
        icon="bookmark"
        title={t("saved.empty")}
        description={t("saved.emptyText")}
        action={
          <Button href="/cart" variant="secondary">
            {t("cart.viewCart")}
          </Button>
        }
      />
    );
  }
  return <SavedList items={shop.saved} />;
}
