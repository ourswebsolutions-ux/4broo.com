"use client";

import { SelectMenu } from "@/components/ui/SelectMenu";
import { CURRENCIES } from "@/config/currency";
import { useT } from "@/i18n/I18nProvider";
import { useCurrency } from "./CurrencyProvider";

const SYMBOL = { PKR: "Rs", USD: "$" };

/** PKR / USD dropdown (separate from language). Hidden when no USD rate is configured. */
export function CurrencyMenu({ tone = "dark", align = "end", className }) {
  const t = useT();
  const { currency, available, setCurrency } = useCurrency();
  if (available.length < 2) return null;

  return (
    <SelectMenu
      label={t("header.currency")}
      heading={t("header.currency")}
      value={currency}
      tone={tone}
      align={align}
      className={className}
      triggerLabel={t("header.changeCurrency", { name: t(`header.currencyNames.${currency}`) })}
      trigger={<span className="eyebrow !text-[0.6875rem] tabular-nums">{CURRENCIES[currency]?.code ?? currency}</span>}
      options={available.map((code) => ({ value: code, label: `${code} · ${t(`header.currencyNames.${code}`)}`, hint: SYMBOL[code], dir: "auto" }))}
      footer={t("header.usdNote")}
      onSelect={setCurrency}
    />
  );
}
