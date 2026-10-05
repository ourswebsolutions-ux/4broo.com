"use client";

import { ImagePlaceholder, SmartImage } from "@/components/media/SmartImage";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { useT } from "@/i18n/I18nProvider";
import Link from "@/i18n/Link";
import { cn } from "@/utils/cn";
import { Money } from "./Money";
import { useShop } from "./ShopProvider";

/** "Saved for later" lines: current price + availability, move back to bag or remove. */
export function SavedList({ items }) {
  const t = useT();
  const shop = useShop();

  return (
    <ul className="grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
      {items.map((item) => {
        const busy = shop.isPending(`unsave:${item.id}`) || shop.isPending(`unsave-remove:${item.id}`);
        const options = [item.size, item.color].filter(Boolean).join(" · ");
        return (
          <li key={item.id} className={cn("flex animate-[fade_400ms_ease-out_both] flex-col gap-3 transition-opacity", busy && "opacity-60")} aria-busy={busy || undefined}>
            <Link href={item.href} className="relative aspect-[4/5] overflow-hidden bg-bone" tabIndex={-1} aria-hidden="true">
              {item.image ? <SmartImage src={item.image.src} alt="" fill sizes="(min-width: 1024px) 22vw, 46vw" className={cn("object-cover", !item.purchasable && "opacity-60 grayscale")} /> : <ImagePlaceholder className="absolute inset-0" />}
            </Link>
            <div className="flex flex-col gap-1">
              <h3 className="text-[0.9375rem] leading-snug">
                <Link href={item.href} className="underline-offset-4 hover:underline">
                  {item.name}
                </Link>
              </h3>
              {options ? <p className="text-xs text-subtle">{options}</p> : null}
              <p className="flex items-baseline gap-2 text-sm">
                <Money value={item.unitPrice} />
                {item.unitPrice.compareAt ? (
                  <s className="text-xs text-mute">
                    <Money value={item.unitPrice.compareAt} />
                  </s>
                ) : null}
              </p>
              <p className={cn("text-xs", item.purchasable ? (item.stock.status === "low_stock" ? "text-gold-deep" : "text-success") : "text-danger")}>
                {item.purchasable ? (item.stock.status === "low_stock" ? t("product.onlyLeft", { count: item.stock.quantity }) : t("product.inStock")) : t("errors.unavailable")}
              </p>
            </div>
            <div className="mt-auto flex items-center gap-3">
              <Button variant="secondary" size="sm" className="flex-1 !px-3" disabled={busy || !item.purchasable} onClick={() => shop.moveSavedToCart(item.id)}>
                {busy ? <Spinner /> : null}
                {t("saved.moveToCart")}
              </Button>
              <button type="button" disabled={busy} onClick={() => shop.removeSaved(item.id)} className="min-h-11 px-1 text-xs text-subtle underline decoration-line underline-offset-4 hover:text-ink disabled:opacity-50">
                {t("saved.remove")}
              </button>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
