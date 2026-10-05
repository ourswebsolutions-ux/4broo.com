"use client";

import { usePathname } from "next/navigation";
import { logoutAction } from "@/actions/auth";
import { Icon } from "@/components/ui/Icon";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { useLocale, useT } from "@/i18n/I18nProvider";
import Link from "@/i18n/Link";
import { splitLocale } from "@/i18n/navigation";
import { cn } from "@/utils/cn";

const ITEMS = [
  { href: "/account", key: "account.overview", icon: "user", exact: true },
  { href: "/account/orders", key: "account.orders", icon: "package" },
  { href: "/cart", key: "account.cart", icon: "bag" },
  { href: "/wishlist", key: "account.wishlist", icon: "heart" },
  { href: "/account/saved", key: "account.saved", icon: "bookmark" },
  { href: "/account/addresses", key: "account.addresses", icon: "mapPin" },
  { href: "/account/profile", key: "account.profile", icon: "lock" },
];

/** Account navigation: sticky list on desktop, horizontally scrollable tabs on mobile. */
export function AccountNav() {
  const t = useT();
  const locale = useLocale();
  const path = splitLocale(usePathname()).path;
  const isActive = (item) => (item.exact ? path === item.href : path === item.href || path.startsWith(`${item.href}/`));

  return (
    <nav aria-label={t("account.navLabel")} className="lg:sticky lg:top-28">
      <ul className="-mx-[clamp(1rem,4vw,3.5rem)] flex snap-x gap-1 overflow-x-auto border-b border-line px-[clamp(1rem,4vw,3.5rem)] scrollbar-none lg:mx-0 lg:flex-col lg:gap-0 lg:overflow-visible lg:border-0 lg:px-0">
        {ITEMS.map((item) => {
          const active = isActive(item);
          return (
            <li key={item.href} className="snap-start">
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "group/item relative flex min-h-12 items-center gap-3 whitespace-nowrap px-3 text-sm transition-colors duration-300 lg:min-h-13 lg:border-b lg:border-line lg:px-0",
                  active ? "text-ink" : "text-subtle hover:text-ink",
                  // active marker: underline on mobile tabs, gold rule on desktop
                  "after:absolute after:inset-x-3 after:bottom-0 after:h-px after:origin-left after:scale-x-0 after:bg-ink after:transition-transform after:duration-500 after:ease-(--ease-luxe) rtl:after:origin-right lg:after:hidden",
                  active && "after:scale-x-100",
                )}
              >
                <span
                  aria-hidden="true"
                  className={cn("hidden h-5 w-px bg-gold transition-[scale] duration-500 ease-(--ease-luxe) lg:block", active ? "scale-y-100" : "scale-y-0 group-hover/item:scale-y-50")}
                />
                <Icon name={item.icon} className={cn("size-4.5 shrink-0 transition-colors", active ? "text-gold-deep" : "text-mute group-hover/item:text-ink")} />
                <span className={cn(active && "font-medium")}>{t(item.key)}</span>
              </Link>
            </li>
          );
        })}
      </ul>
      <form action={logoutAction} className="mt-8 hidden lg:block">
        <input type="hidden" name="locale" value={locale} />
        <SubmitButton variant="ghost" size="sm" fullWidth={false} pendingLabel={t("account.signingOut")} className="!px-0 hover:!bg-transparent hover:text-danger">
          <Icon name="logout" className="size-4" />
          {t("account.signOut")}
        </SubmitButton>
      </form>
    </nav>
  );
}

/** Sign-out for the mobile account header (desktop shows it in the nav). */
export function SignOutButton({ className }) {
  const t = useT();
  const locale = useLocale();
  return (
    <form action={logoutAction} className={className}>
      <input type="hidden" name="locale" value={locale} />
      <SubmitButton variant="secondary" size="sm" fullWidth={false} pendingLabel={t("account.signingOut")}>
        <Icon name="logout" className="size-4" />
        {t("account.signOut")}
      </SubmitButton>
    </form>
  );
}
