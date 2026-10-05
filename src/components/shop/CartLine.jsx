"use client";

import { ImagePlaceholder, SmartImage } from "@/components/media/SmartImage";
import { Spinner } from "@/components/ui/Spinner";
import { useT } from "@/i18n/I18nProvider";
import Link from "@/i18n/Link";
import { cn } from "@/utils/cn";
import { Money } from "./Money";
import { QuantityStepper } from "./QuantityStepper";
import { useShop } from "./ShopProvider";

const LINK_ACTION = "inline-flex min-h-9 items-center gap-1.5 text-xs text-subtle underline decoration-line underline-offset-4 transition-colors hover:text-ink hover:decoration-ink disabled:pointer-events-none disabled:opacity-50";

/**
 * One bag line (drawer: compact; cart page: with SKU and unit price).
 * Prices shown are the server's figures for this line.
 */
export function CartLine({ line, compact = false, onNavigate }) {
  const t = useT();
  const shop = useShop();
  const busy = ["qty", "remove", "save"].some((kind) => shop.isPending(`${kind}:${line.id}`));
  const overStock = line.purchasable && line.quantity > line.maxQuantity;
  const options = [line.size, line.color].filter(Boolean).join(" · ");

  return (
    <li className={cn("flex animate-[fade_400ms_ease-out_both] gap-4 py-5 transition-opacity duration-300 sm:gap-5", busy && "opacity-60")} aria-busy={busy || undefined}>
      <Link href={line.href} onClick={onNavigate} className={cn("relative shrink-0 overflow-hidden bg-bone", compact ? "h-28 w-22" : "h-36 w-28 sm:h-44 sm:w-36")} tabIndex={-1} aria-hidden="true">
        {line.image ? <SmartImage src={line.image.src} alt="" fill sizes="144px" className={cn("object-cover", !line.purchasable && "opacity-60 grayscale")} /> : <ImagePlaceholder className="absolute inset-0" />}
      </Link>

      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-[0.9375rem] leading-snug">
            <Link href={line.href} onClick={onNavigate} className="underline-offset-4 hover:underline">
              {line.name}
            </Link>
          </h3>
          <Money value={line.lineTotal} className="shrink-0 text-end text-sm font-medium" />
        </div>

        {options ? <p className="text-xs text-subtle">{options}</p> : null}
        {!compact ? (
          <p className="text-xs text-mute">
            {t("product.sku")}: <span className="tabular-nums">{line.sku}</span>
          </p>
        ) : null}
        {!compact || line.quantity > 1 ? (
          <p className="flex items-baseline gap-2 text-xs text-mute">
            <span>{t("cart.price")}</span>
            <Money value={line.unitPrice} />
            {line.unitPrice.compareAt ? (
              <s className="text-line">
                <Money value={line.unitPrice.compareAt} />
              </s>
            ) : null}
          </p>
        ) : null}

        {!line.purchasable ? <p className="text-xs text-danger">{t("cart.unavailable")}</p> : null}
        {overStock ? <p className="text-xs text-danger">{t("cart.reduceQuantity", { count: line.maxQuantity })}</p> : null}
        {line.purchasable && !overStock && line.stock.status === "low_stock" ? <p className="text-xs text-gold-deep">{t("product.onlyLeft", { count: line.stock.quantity })}</p> : null}

        <div className="mt-auto flex flex-wrap items-center justify-between gap-x-4 gap-y-2 pt-2">
          {line.purchasable ? (
            <QuantityStepper
              size="sm"
              value={line.quantity}
              max={Math.max(line.maxQuantity, line.quantity > line.maxQuantity ? line.quantity : 0)}
              disabled={busy}
              label={t("cart.quantityOf", { name: line.name })}
              onChange={(quantity) => shop.updateQuantity(line.id, quantity)}
            />
          ) : (
            <span />
          )}
          <div className="flex items-center gap-4">
            {busy ? <Spinner className="size-3.5 text-mute" /> : null}
            <button type="button" className={LINK_ACTION} disabled={busy} onClick={() => shop.saveForLater(line.id)}>
              {t("cart.saveForLater")}
            </button>
            <button type="button" className={LINK_ACTION} disabled={busy} onClick={() => shop.removeItem(line.id)} aria-label={t("cart.removeItem", { name: line.name })}>
              {t("cart.remove")}
            </button>
          </div>
        </div>
      </div>
    </li>
  );
}
