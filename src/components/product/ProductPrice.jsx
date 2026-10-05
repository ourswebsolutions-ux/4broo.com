"use client";

import { useCurrency } from "@/components/currency/CurrencyProvider";
import { useT } from "@/i18n/I18nProvider";
import { formatMoney } from "@/lib/currency/money";
import { cn } from "@/utils/cn";

/**
 * PKR price (canonical) with optional original price, plus an approximate USD
 * figure when the server supplied one. Formatting is centralised in formatMoney.
 * @param {{ price: import("@/data/mappers").Price, size?: "sm"|"lg", showUsd?: boolean, className?: string }} props
 */
export function ProductPrice({ price, size = "sm", showUsd = true, className }) {
  const t = useT();
  const { currency } = useCurrency();
  const onSale = Boolean(price.compareAt);
  // USD display (when chosen and a rate exists): converted figures first, PKR (charged) below.
  const usdPrimary = currency === "USD" && price.usd;
  const shown = usdPrimary ? { amount: price.usd.amount, compareAt: price.usd.compareAt, currency: "USD" } : price;

  return (
    <div className={cn("flex flex-col gap-0.5", className)}>
      <p className={cn("flex flex-wrap items-baseline gap-x-2.5 tabular-nums", size === "lg" ? "text-xl" : "text-sm")}>
        {onSale ? (
          <>
            <span className="sr-only">{t("product.salePrice")}</span>
            <bdi className="font-medium text-ink">{formatMoney(shown.amount, shown.currency)}</bdi>
            <span className="sr-only">{t("product.originalPrice")}</span>
            <s className="text-mute">
              <bdi>{formatMoney(shown.compareAt, shown.currency)}</bdi>
            </s>
          </>
        ) : (
          <bdi className="text-ink">{formatMoney(shown.amount, shown.currency)}</bdi>
        )}
      </p>
      {showUsd && price.usd ? (
        <p className={cn("tabular-nums text-mute", size === "lg" ? "text-sm" : "text-xs")}>
          {/* bdi keeps "≈ $53.28" in reading order inside RTL (Urdu) pages */}
          <bdi dir="ltr">
            {usdPrimary ? formatMoney(price.amount, price.currency) : t("product.approx", { amount: formatMoney(price.usd.amount, "USD") })}
          </bdi>
        </p>
      ) : null}
    </div>
  );
}
