"use client";

import { ImagePlaceholder, SmartImage } from "@/components/media/SmartImage";
import { useT } from "@/i18n/I18nProvider";
import Link from "@/i18n/Link";
import { cn } from "@/utils/cn";
import { FavoriteButton } from "./FavoriteButton";
import { getProductBadges, ProductBadge } from "./ProductBadge";
import { ProductPrice } from "./ProductPrice";
import { tiltHandlers } from "./useTilt";

export const PRODUCT_CARD_SIZES = "(min-width: 1280px) 22vw, (min-width: 768px) 30vw, 46vw";

/**
 * Product tile, rendered from the `ProductCardData` shape (src/data/mappers.js).
 * Hover swaps to the second image only when the product really has one.
 *
 * @param {{ product: import("@/data/mappers").ProductCardData, preload?: boolean, className?: string }} props
 */
export function ProductCard({ product, preload = false, className }) {
  const t = useT();
  const [primary, secondary] = product.images;
  const badges = getProductBadges(product, t);
  const soldOut = product.stock.status === "out_of_stock";

  return (
    <article className={cn("group relative flex flex-col", className)}>
      {/* Fixed 4:5 frame → consistent grid, zero layout shift. */}
      <div
        {...tiltHandlers}
        className="tilt relative aspect-[4/5] overflow-hidden bg-bone group-hover:shadow-[0_24px_48px_-28px_rgb(11_11_10/0.45)]"
      >
        <Link href={product.href} className="absolute inset-0" tabIndex={-1} aria-hidden="true">
          {primary ? (
            <SmartImage
              src={primary.src}
              alt={primary.alt}
              fill
              sizes={PRODUCT_CARD_SIZES}
              preload={preload}
              className={cn(
                "object-cover transition-[opacity,scale] duration-[900ms] ease-(--ease-luxe) group-hover:scale-[1.04]",
                secondary && "group-hover:opacity-0",
                soldOut && "opacity-80",
              )}
            />
          ) : (
            <ImagePlaceholder className="absolute inset-0" />
          )}
          {secondary ? (
            <SmartImage
              src={secondary.src}
              alt=""
              fill
              sizes={PRODUCT_CARD_SIZES}
              className="object-cover opacity-0 transition-opacity duration-700 ease-(--ease-luxe) group-hover:opacity-100"
            />
          ) : null}
        </Link>

        {badges.length ? (
          <div className="pointer-events-none absolute start-3 top-3 flex animate-[fade_500ms_ease-out_both] flex-col items-start gap-1.5">
            {badges.map((badge) => (
              <ProductBadge key={badge.variant} variant={badge.variant}>
                {badge.label}
              </ProductBadge>
            ))}
          </div>
        ) : null}

        <FavoriteButton productId={product.id} productName={product.name} className="absolute end-1.5 top-1.5 hover:bg-paper/60" />

        {/* Quick action — slides up on hover (desktop); always reachable by keyboard. */}
        <Link
          href={product.href}
          className={cn(
            "eyebrow absolute inset-x-3 bottom-3 hidden h-11 items-center justify-center bg-paper/95 text-ink backdrop-blur-sm transition-[translate,opacity] duration-500 ease-(--ease-luxe) lg:flex",
            "translate-y-3 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 focus-visible:translate-y-0 focus-visible:opacity-100",
          )}
        >
          {t("product.viewDetails")}
          <span className="sr-only">: {product.name}</span>
        </Link>
      </div>

      <div className="flex flex-col gap-1.5 pt-4">
        {product.category ? <p className="eyebrow !text-[0.625rem] text-mute">{product.category.name}</p> : null}
        <h3 className="text-[0.9375rem] leading-snug">
          <Link href={product.href} className="inline-block py-1 underline-offset-4 hover:underline">
            {product.name}
          </Link>
        </h3>
        <ProductPrice price={product.price} />
        {product.stock.status === "low_stock" ? <p className="text-xs text-gold-deep">{t("product.lowStock")}</p> : null}
      </div>
    </article>
  );
}
