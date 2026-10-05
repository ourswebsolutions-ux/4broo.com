"use client";

import { Icon } from "@/components/ui/Icon";
import { useT } from "@/i18n/I18nProvider";
import { cn } from "@/utils/cn";

/** − qty + control. The server re-validates every change against live stock. */
export function QuantityStepper({ value, max, onChange, disabled = false, label, size = "md", className }) {
  const t = useT();
  const limit = Math.max(1, Math.min(max ?? 99, 99));
  const button = cn(
    "grid place-items-center text-ink transition-[color,background-color,scale] duration-200 hover:bg-bone active:scale-90 disabled:pointer-events-none disabled:text-line",
    size === "sm" ? "size-9" : "size-11",
  );

  return (
    <div role="group" aria-label={label ?? t("cart.quantity")} aria-busy={disabled || undefined} className={cn("inline-flex items-center border border-line", disabled && "opacity-60", className)}>
      <button type="button" className={button} onClick={() => onChange(value - 1)} disabled={disabled || value <= 1} aria-label={t("cart.decrease")}>
        <Icon name="minus" className="size-3.5" />
      </button>
      <output aria-live="polite" className={cn("min-w-8 text-center text-sm tabular-nums", size === "sm" ? "leading-9" : "leading-[2.75rem]")}>
        {value}
      </output>
      <button type="button" className={button} onClick={() => onChange(value + 1)} disabled={disabled || value >= limit} aria-label={t("cart.increase")}>
        <Icon name="plus" className="size-3.5" />
      </button>
    </div>
  );
}
