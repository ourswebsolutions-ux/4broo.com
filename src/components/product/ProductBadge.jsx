import { cn } from "@/utils/cn";

const STYLES = {
  new: "bg-paper text-ink",
  bestSeller: "bg-ink text-gold",
  featured: "bg-ink text-paper",
  sale: "bg-gold text-ink",
  soldOut: "bg-ink/85 text-paper",
};

export function ProductBadge({ variant, children, className }) {
  return (
    <span className={cn("eyebrow px-2.5 py-1.5 !text-[0.625rem] !tracking-[0.2em]", STYLES[variant], className)}>
      {/* bdi keeps "−20%" intact on RTL pages */}
      <bdi dir={variant === "sale" ? "ltr" : undefined}>{children}</bdi>
    </span>
  );
}

/**
 * Ordered badge list for a product (max two, most important first) — driven
 * entirely by database flags/prices. `t` translates the labels.
 */
export function getProductBadges(product, t) {
  const badges = [];
  if (product.stock.status === "out_of_stock") badges.push({ variant: "soldOut", label: t("product.badge.soldOut") });
  if (product.badges.isOnSale) {
    badges.push({ variant: "sale", label: product.price.discountPercent ? `−${product.price.discountPercent}%` : t("product.badge.sale") });
  }
  if (product.badges.isNew) badges.push({ variant: "new", label: t("product.badge.new") });
  if (product.badges.isBestSeller) badges.push({ variant: "bestSeller", label: t("product.badge.bestSeller") });
  if (product.badges.isFeatured) badges.push({ variant: "featured", label: t("product.badge.featured") });
  return badges.slice(0, 2);
}
