"use client";

import { Suspense, useState } from "react";
import { accountLinks, departments, highlights } from "@/config/navigation";
import { Drawer } from "@/components/ui/Drawer";
import { Icon } from "@/components/ui/Icon";
import { Logo } from "@/components/ui/Logo";
import { useT } from "@/i18n/I18nProvider";
import Link from "@/i18n/Link";
import { cn } from "@/utils/cn";
import { CurrencyMenu } from "@/components/currency/CurrencyMenu";
import { LanguageMenu } from "./LanguageMenu";

const SECONDARY = [
  { labelKey: "nav.account", href: accountLinks.account, icon: "user" },
  { labelKey: "nav.wishlist", href: accountLinks.wishlist, icon: "heart" },
  { labelKey: "nav.cart", href: accountLinks.cart, icon: "bag" },
  { labelKey: "nav.search", href: accountLinks.search, icon: "search" },
];

/** Full-height slide-out navigation for mobile & tablet. Slides from the reading-start side. */
export function MobileMenu({ contact, className }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={t("nav.openMenu")}
        aria-expanded={open}
        className={cn("grid size-11 place-items-center text-paper/85 transition-colors hover:text-gold", className)}
      >
        <Icon name="menu" className="size-6" />
      </button>

      <Drawer open={open} onClose={close} label={t("nav.menu")} side="start" tone="dark" closeLabel={t("common.close")}>
        {/* Close the menu when any link inside is followed. */}
        <div className="flex h-full flex-col overflow-y-auto overscroll-contain" onClick={(event) => event.target.closest("a") && close()}>
          <div className="flex h-16 shrink-0 items-center px-5">
            <Logo className="h-10" />
          </div>

          {/* Preferences first, so language & currency are easy to find on phones. */}
          <div className="mx-5 flex items-center justify-between gap-2 border-y border-graphite py-1.5">
            <span className="eyebrow !text-[0.625rem] text-mist">
              {t("header.language")} · {t("header.currency")}
            </span>
            <div className="flex items-center">
              <Suspense fallback={null}>
                <LanguageMenu />
              </Suspense>
              <CurrencyMenu />
            </div>
          </div>

          <nav aria-label={t("nav.menu")} className="flex flex-1 flex-col px-5 pb-8 pt-6">
            <p className="eyebrow mb-4 text-gold">{t("nav.shop")}</p>
            <ul className="flex flex-col">
              {departments.map((item) => (
                <li key={item.href} className="border-b border-graphite">
                  {item.children ? (
                    <details className="group/acc">
                      <summary className="flex min-h-16 cursor-pointer list-none items-center justify-between [&::-webkit-details-marker]:hidden">
                        <span className="headline text-[2rem] leading-none">{t(item.labelKey)}</span>
                        <Icon name="chevronDown" className="size-5 text-mist transition-transform duration-300 group-open/acc:rotate-180" />
                      </summary>
                      <ul className="flex flex-col pb-5 ps-1">
                        {item.children.map((child) => (
                          <li key={child.href}>
                            <Link href={child.href} className="flex min-h-11 items-center text-paper/80 hover:text-gold">
                              {t(child.labelKey)}
                            </Link>
                          </li>
                        ))}
                        <li>
                          <Link href={item.href} className="eyebrow flex min-h-11 items-center text-gold">
                            {t("nav.allOf", { name: t(item.labelKey) })}
                          </Link>
                        </li>
                      </ul>
                    </details>
                  ) : (
                    <Link href={item.href} className="flex min-h-16 items-center justify-between">
                      <span className="headline text-[2rem] leading-none">{t(item.labelKey)}</span>
                      <Icon name="chevronRight" className="size-5 text-mist rtl:-scale-x-100" />
                    </Link>
                  )}
                </li>
              ))}
            </ul>

            <ul className="mt-6 flex flex-col">
              {highlights.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className={cn("eyebrow flex min-h-12 items-center", item.accent ? "text-gold" : "text-paper")}>
                    {t(item.labelKey)}
                  </Link>
                </li>
              ))}
            </ul>

            <ul className="mt-8 grid grid-cols-2 gap-px border border-graphite bg-graphite">
              {SECONDARY.map((item) => (
                <li key={item.labelKey} className="bg-ink">
                  <Link href={item.href} className="flex min-h-14 items-center gap-3 px-4 text-sm text-paper/85 hover:text-gold">
                    <Icon name={item.icon} className="size-4.5 text-gold" />
                    {t(item.labelKey)}
                  </Link>
                </li>
              ))}
            </ul>

            <div className="mt-auto flex flex-col gap-3 pt-10 text-sm text-mist">
              {contact?.whatsappNumber ? (
                <a href={`https://wa.me/${contact.whatsappNumber}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-3 hover:text-gold">
                  <Icon name="whatsapp" className="size-4.5 text-gold" />
                  {t("nav.whatsapp")}
                </a>
              ) : null}
              <p className="font-display text-xl italic text-paper/70">{t("brand.tagline")}</p>
            </div>
          </nav>
        </div>
      </Drawer>
    </>
  );
}
