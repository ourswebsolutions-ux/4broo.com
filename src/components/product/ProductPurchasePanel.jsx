"use client";

import { useMemo, useState } from "react";
import { QuantityStepper } from "@/components/shop/QuantityStepper";
import { useShop } from "@/components/shop/ShopProvider";
import { Spinner } from "@/components/ui/Spinner";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { useT } from "@/i18n/I18nProvider";
import { sortSizes } from "@/lib/catalog/sizes";
import { cn } from "@/utils/cn";
import { ProductPrice } from "./ProductPrice";

/**
 * Variant selection + live price / SKU / stock for the product page.
 * Selecting a size or colour updates the shown variant immediately (no reload).
 * "Add to bag" requires a complete, in-stock variant; the server re-checks product,
 * variant ownership, stock and price. WhatsApp enquiry includes the selection.
 *
 * @param {{ product: ReturnType<typeof import("@/data/mappers").toProductDetail>, whatsappNumber: string | null }} props
 */
export function ProductPurchasePanel({ product, whatsappNumber }) {
  const t = useT();
  const { variants } = product;
  const shop = useShop();
  const [quantity, setQuantity] = useState(1);
  const [attempted, setAttempted] = useState(false);

  const sizes = useMemo(() => sortSizes([...new Set(variants.map((variant) => variant.size).filter(Boolean))]), [variants]);
  const colors = useMemo(() => {
    const map = new Map();
    for (const variant of variants) if (variant.color && !map.has(variant.color)) map.set(variant.color, variant.colorHex);
    return [...map].map(([name, hex]) => ({ name, hex }));
  }, [variants]);

  // Auto-select when there is only one choice.
  const [size, setSize] = useState(sizes.length === 1 ? sizes[0] : null);
  const [color, setColor] = useState(colors.length === 1 ? colors[0].name : null);

  const needsSize = sizes.length > 0;
  const needsColor = colors.length > 0;
  const complete = (!needsSize || size) && (!needsColor || color);

  const selected = useMemo(() => {
    if (!variants.length) return null;
    if (variants.length === 1 && !needsSize && !needsColor) return variants[0];
    if (!complete) return null;
    return variants.find((variant) => (variant.size ?? null) === (size ?? null) && (variant.color ?? null) === (color ?? null)) ?? null;
  }, [variants, needsSize, needsColor, complete, size, color]);

  const available = (predicate) => variants.some((variant) => predicate(variant) && variant.stock.status !== "out_of_stock");
  const sizeAvailable = (value) => available((variant) => variant.size === value && (!color || variant.color === color));
  const colorAvailable = (value) => available((variant) => variant.color === value && (!size || variant.size === size));

  const soldOut = selected?.stock.status === "out_of_stock";
  const maxQuantity = selected ? Math.min(selected.stock.quantity, 99) : 99;
  const adding = selected ? shop.isPending(`add:${selected.id}`) : false;
  const missingSize = needsSize && !size;
  const missingColor = needsColor && !color;

  const addToBag = async () => {
    if (!selected) {
      setAttempted(true);
      return;
    }
    if (soldOut) return;
    const ok = await shop.addToCart(selected.id, Math.min(quantity, maxQuantity));
    if (ok) setQuantity(1);
  };

  const price = selected?.price ?? product.price;
  const stock = selected?.stock ?? (variants.length ? null : product.stock);
  const sku = selected?.sku ?? product.sku;

  const enquiry = [
    t("product.whatsappMessage", { name: product.name }),
    [size, color].filter(Boolean).join(" / "),
    sku ? `${t("product.sku")}: ${sku}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  return (
    <div className="flex flex-col gap-7">
      <ProductPrice price={price} size="lg" />

      {needsColor ? (
        <fieldset className="flex flex-col gap-3">
          <legend className={cn("eyebrow mb-3 flex gap-2", attempted && missingColor ? "text-danger" : "text-subtle")}>
            {t("product.color")}
            {color ? <span className="text-ink">— {color}</span> : null}
          </legend>
          <div className="flex flex-wrap gap-2">
            {colors.map((option) => {
              const isAvailable = colorAvailable(option.name);
              const active = color === option.name;
              return (
                <button
                  key={option.name}
                  type="button"
                  aria-pressed={active}
                  aria-label={`${option.name}${isAvailable ? "" : ` — ${t("product.unavailable")}`}`}
                  title={option.name}
                  onClick={() => setColor(active && colors.length > 1 ? null : option.name)}
                  className={cn(
                    "relative grid size-11 place-items-center rounded-full border transition-colors",
                    active ? "border-ink" : "border-line hover:border-mute",
                  )}
                >
                  <span
                    className={cn("size-7 rounded-full border border-ink/10", !option.hex && "bg-sand")}
                    style={option.hex ? { backgroundColor: option.hex } : undefined}
                  />
                  {!isAvailable ? <span aria-hidden="true" className="absolute h-px w-9 rotate-45 bg-mute" /> : null}
                </button>
              );
            })}
          </div>
        </fieldset>
      ) : null}

      {needsSize ? (
        <fieldset className="flex flex-col gap-3">
          <legend className={cn("eyebrow mb-3", attempted && missingSize ? "text-danger" : "text-subtle")}>{t("product.size")}</legend>
          <div className="flex flex-wrap gap-2">
            {sizes.map((option) => {
              const isAvailable = sizeAvailable(option);
              const active = size === option;
              return (
                <button
                  key={option}
                  type="button"
                  aria-pressed={active}
                  aria-label={`${option}${isAvailable ? "" : ` — ${t("product.unavailable")}`}`}
                  onClick={() => setSize(active && sizes.length > 1 ? null : option)}
                  className={cn(
                    "h-11 min-w-12 border px-4 text-sm transition-colors",
                    active ? "border-ink bg-ink text-paper" : "border-line hover:border-ink",
                    !isAvailable && !active && "text-mute line-through decoration-mute",
                  )}
                >
                  {option}
                </button>
              );
            })}
          </div>
        </fieldset>
      ) : null}

      <div className="flex flex-col gap-1.5 text-sm" aria-live="polite">
        {!stock ? (
          <p className={attempted ? "text-danger" : "text-mute"}>{missingSize ? t("product.selectSize") : missingColor ? t("product.selectColor") : t("product.selectOptions")}</p>
        ) : stock.status === "out_of_stock" ? (
          <p className="text-danger">{t("product.currentlySoldOut")}</p>
        ) : stock.status === "low_stock" ? (
          <p className="text-gold-deep">{t("product.onlyLeft", { count: stock.quantity })}</p>
        ) : (
          <p className="text-success">{t("product.inStock")}</p>
        )}
        {sku ? (
          <p className="text-xs text-mute">
            {t("product.sku")}: <span className="tabular-nums">{sku}</span>
          </p>
        ) : null}
      </div>

      <div className="flex flex-col gap-3 border-t border-line pt-6">
        <div className="flex gap-3">
          {selected && !soldOut ? (
            <QuantityStepper value={Math.min(quantity, maxQuantity)} max={maxQuantity} onChange={setQuantity} disabled={adding} className="shrink-0" />
          ) : null}
          <Button fullWidth size="lg" onClick={addToBag} disabled={adding || soldOut || !variants.length} aria-busy={adding || undefined} className="flex-1 !px-6">
            {adding ? <Spinner /> : <Icon name="bag" className="size-4" />}
            {soldOut ? t("product.currentlySoldOut") : t("product.addToBag")}
          </Button>
        </div>
        {whatsappNumber ? (
          <Button
            href={`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(enquiry)}`}
            variant="secondary"
            size="lg"
            fullWidth
            target="_blank"
            rel="noopener noreferrer"
          >
            <Icon name="whatsapp" className="size-4" />
            {t("product.askWhatsapp")}
          </Button>
        ) : null}
        {price.usd ? <p className="text-xs text-mute">{t("product.chargedInPkr")}</p> : null}
      </div>
    </div>
  );
}
