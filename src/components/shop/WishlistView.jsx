"use client";

import { ProductCard } from "@/components/product/ProductCard";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Spinner } from "@/components/ui/Spinner";
import { useT } from "@/i18n/I18nProvider";
import { useShop } from "./ShopProvider";

/**
 * Wishlist grid. Cards come from the server (current price + availability);
 * removing a favourite hides it immediately. Single-variant pieces can be added
 * to the bag directly, others link to the product to choose a size/colour.
 */
export function WishlistView({ items }) {
  const t = useT();
  const shop = useShop();
  // Once the shop state has loaded, it is the source of truth for membership.
  const visible = shop.status === "ready" ? items.filter((item) => shop.wishlist.has(item.id)) : items;

  if (!visible.length) {
    return (
      <EmptyState
        icon="heart"
        title={t("wishlist.empty")}
        description={t("wishlist.emptyText")}
        action={
          <Button href="/collections/new-arrivals" arrow>
            {t("wishlist.discover")}
          </Button>
        }
      />
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <p className="text-sm text-subtle" aria-live="polite">
        {t("wishlist.count", { count: visible.length })}
      </p>
      <ul className="grid grid-cols-2 gap-x-4 gap-y-12 sm:gap-x-6 md:grid-cols-3 xl:grid-cols-4">
        {visible.map((item) => {
          const soldOut = item.stock.status === "out_of_stock";
          const adding = shop.isPending(`wish-cart:${item.id}`);
          return (
            <li key={item.id} className="flex flex-col gap-4">
              <ProductCard product={item} />
              {item.quickAddVariantId && !soldOut ? (
                <Button variant="secondary" size="sm" fullWidth disabled={adding} onClick={() => shop.wishlistToCart(item.id)}>
                  {adding ? <Spinner /> : null}
                  {t("wishlist.addToBag")}
                </Button>
              ) : (
                <Button href={item.href} variant="secondary" size="sm" fullWidth className={soldOut ? "pointer-events-none opacity-50" : undefined} aria-disabled={soldOut || undefined}>
                  {soldOut ? t("product.currentlySoldOut") : t("wishlist.chooseOptions")}
                </Button>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
