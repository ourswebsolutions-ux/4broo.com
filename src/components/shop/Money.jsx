"use client";

import { useCurrency } from "@/components/currency/CurrencyProvider";
import { formatMoney } from "@/lib/currency/money";
import { cn } from "@/utils/cn";

/**
 * Displays a server-computed amount ({ amount: PKR, usd }) in the shopper's
 * chosen currency. With `showBase`, a USD figure is followed by the PKR amount
 * actually charged. No arithmetic happens here — values come from the server.
 */
export function Money({ value, showBase = false, className }) {
  const { currency } = useCurrency();
  if (!value) return null;
  const usd = currency === "USD" && value.usd;

  return (
    <span className={cn("inline-flex flex-col tabular-nums", className)}>
      <bdi dir="ltr">{usd ? formatMoney(value.usd, "USD") : formatMoney(value.amount, "PKR")}</bdi>
      {usd && showBase ? (
        <bdi dir="ltr" className="text-xs text-mute">
          {formatMoney(value.amount, "PKR")}
        </bdi>
      ) : null}
    </span>
  );
}
