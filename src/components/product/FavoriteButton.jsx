"use client";

import { useState } from "react";
import { useShop } from "@/components/shop/ShopProvider";
import { Icon } from "@/components/ui/Icon";
import { useT } from "@/i18n/I18nProvider";
import { cn } from "@/utils/cn";

/**
 * Favourite (wishlist) toggle backed by the customer's database wishlist.
 * Optimistic: the heart fills immediately and reverts if the server refuses.
 * Guests see a sign-in prompt; the favourite is added after they sign in.
 */
export function FavoriteButton({ productId, productName, className }) {
  const t = useT();
  const shop = useShop();
  const active = shop.wishlist.has(productId);
  const [animate, setAnimate] = useState(false);

  return (
    <button
      type="button"
      aria-pressed={active}
      aria-label={t(active ? "product.removeFavorite" : "product.addFavorite", { name: productName })}
      disabled={shop.isPending(`wish:${productId}`)}
      onClick={(event) => {
        event.preventDefault();
        setAnimate(!active);
        shop.toggleFavorite(productId);
      }}
      onAnimationEnd={() => setAnimate(false)}
      className={cn("grid size-11 place-items-center text-ink transition-colors duration-300 hover:text-gold-deep disabled:cursor-wait", className)}
    >
      <Icon name="heart" filled={active} className={cn("size-5 transition-colors duration-300", active && "text-gold-deep", animate && "animate-pop")} />
    </button>
  );
}
