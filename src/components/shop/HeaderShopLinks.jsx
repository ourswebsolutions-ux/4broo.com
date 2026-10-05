"use client";

import { Icon } from "@/components/ui/Icon";
import { useT } from "@/i18n/I18nProvider";
import Link from "@/i18n/Link";
import { cn } from "@/utils/cn";
import { useShop } from "./ShopProvider";

/** Header bag button: opens the cart drawer and shows the live item count. */
export function CartButton({ className }) {
  const t = useT();
  const { cart, openDrawer } = useShop();
  const count = cart.count;

  return (
    <button type="button" onClick={openDrawer} className={cn("group/cart relative", className)} aria-label={count ? t("header.bagCount", { count }) : t("header.bag")}>
      <Icon name="bag" className="transition-transform duration-300 group-active/cart:scale-90" />
      {count ? (
        <span
          key={count}
          aria-hidden="true"
          className="absolute end-1 top-1.5 grid h-4.5 min-w-4.5 animate-pop place-items-center rounded-full bg-gold px-1 text-[0.625rem] font-medium leading-none tabular-nums text-ink"
        >
          {count > 99 ? "99+" : count}
        </span>
      ) : null}
    </button>
  );
}

/** Account icon: "Sign in" for guests, the customer's name otherwise (for screen readers). */
export function AccountLink({ className }) {
  const t = useT();
  const { user } = useShop();

  return (
    <Link href={user ? "/account" : "/login"} className={cn("relative", className)} aria-label={user ? t("header.accountOf", { name: user.firstName }) : t("header.signIn")}>
      <Icon name="user" />
      {user ? <span aria-hidden="true" className="absolute end-2.5 top-2.5 size-1.5 rounded-full bg-gold" /> : null}
    </Link>
  );
}

/** Wishlist icon with a filled heart once the customer has favourites. */
export function WishlistLink({ className }) {
  const t = useT();
  const { wishlist } = useShop();

  return (
    <Link href="/wishlist" className={className} aria-label={t("nav.wishlist")}>
      <Icon name="heart" filled={wishlist.size > 0} className={cn(wishlist.size > 0 && "text-gold")} />
    </Link>
  );
}
