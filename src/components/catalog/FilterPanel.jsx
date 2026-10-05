"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { useT } from "@/i18n/I18nProvider";
import { convertMoney, formatMoney } from "@/lib/currency/money";
import { cn } from "@/utils/cn";

const toggle = (list, value) => (list.includes(value) ? list.filter((item) => item !== value) : [...list, value]);

function Group({ id, title, count = 0, children, defaultOpen = true }) {
  return (
    <details open={defaultOpen} className="group/filter border-b border-line py-1">
      <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 [&::-webkit-details-marker]:hidden" id={id}>
        <span className="eyebrow">
          {title}
          {count ? <span className="ms-2 tabular-nums text-gold-deep">{count}</span> : null}
        </span>
        <Icon name="chevronDown" className="size-4 text-mute transition-transform duration-300 ease-(--ease-luxe) group-open/filter:rotate-180" />
      </summary>
      <div className="pb-5 pt-1">{children}</div>
    </details>
  );
}

/** Animated, accessible checkbox row (native input, custom visual). */
function CheckRow({ label, checked, onChange, count, disabled }) {
  return (
    <label className={cn("group/check flex min-h-10 cursor-pointer items-center gap-3 text-sm", disabled && "cursor-not-allowed opacity-40")}>
      <input type="checkbox" className="peer sr-only" checked={checked} onChange={onChange} disabled={disabled} />
      <span
        aria-hidden="true"
        className={cn(
          "grid size-[18px] shrink-0 place-items-center border transition-colors duration-200 peer-focus-visible:outline peer-focus-visible:outline-1 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ink",
          checked ? "border-ink bg-ink text-paper" : "border-mute/60 bg-paper group-hover/check:border-ink",
        )}
      >
        <Icon name="check" strokeWidth={2.2} className={cn("size-3 transition-transform duration-200 ease-(--ease-luxe)", checked ? "scale-100" : "scale-0")} />
      </span>
      <span className="flex-1">{label}</span>
      {typeof count === "number" ? <span className="text-xs tabular-nums text-mute">{count}</span> : null}
    </label>
  );
}

/** Dual-thumb price slider + numeric inputs, in the shopper's display currency. */
function PriceFilter({ state, facets, displayCurrency, usdRate, onApply }) {
  const t = useT();
  const toDisplay = (pkr) => (pkr === null || pkr === undefined ? null : displayCurrency === "USD" && usdRate ? convertMoney(pkr, usdRate) : pkr);
  const floor = Math.floor(Number(toDisplay(facets.price.min) ?? 0));
  const ceil = Math.ceil(Number(toDisplay(facets.price.max) ?? 0));
  const sameCurrency = (state.currency ?? "PKR") === displayCurrency;

  const [min, setMin] = useState(sameCurrency ? state.min : "");
  const [max, setMax] = useState(sameCurrency ? state.max : "");
  const [error, setError] = useState(null);

  if (!(ceil > floor) && !state.min && !state.max) return null;

  const apply = (nextMin = min, nextMax = max) => {
    const a = nextMin === "" ? "" : String(Math.max(0, Math.floor(Number(nextMin))));
    const b = nextMax === "" ? "" : String(Math.max(0, Math.ceil(Number(nextMax))));
    if ((a && Number.isNaN(Number(a))) || (b && Number.isNaN(Number(b)))) return setError(t("filters.price"));
    if (a && b && Number(b) < Number(a)) {
      setError(`${t("filters.max")} < ${t("filters.min")}`);
      return;
    }
    setError(null);
    onApply({ min: a, max: b, currency: displayCurrency });
  };

  const lo = Number(min || floor);
  const hi = Number(max || ceil);
  const span = Math.max(1, ceil - floor);
  const symbol = displayCurrency;

  return (
    <div className="flex flex-col gap-5">
      {ceil > floor ? (
        <div className="relative h-6" dir="ltr">
          <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-line" />
          <div className="absolute top-1/2 h-0.5 -translate-y-1/2 bg-ink" style={{ left: `${((Math.min(lo, hi) - floor) / span) * 100}%`, right: `${100 - ((Math.max(lo, hi) - floor) / span) * 100}%` }} />
          {[
            { value: lo, label: t("filters.min"), set: setMin, commit: (v) => apply(v, max) },
            { value: hi, label: t("filters.max"), set: setMax, commit: (v) => apply(min, v) },
          ].map((thumb) => (
            <input
              key={thumb.label}
              type="range"
              min={floor}
              max={ceil}
              step={Math.max(1, Math.round(span / 100))}
              value={Math.min(Math.max(thumb.value, floor), ceil)}
              aria-label={`${thumb.label} (${symbol})`}
              onChange={(event) => thumb.set(event.target.value)}
              onPointerUp={(event) => thumb.commit(event.target.value)}
              onKeyUp={(event) => ["ArrowLeft", "ArrowRight", "Home", "End", "PageUp", "PageDown"].includes(event.key) && thumb.commit(event.target.value)}
              className="price-thumb pointer-events-none absolute inset-0 h-6 w-full appearance-none bg-transparent"
            />
          ))}
        </div>
      ) : null}

      <form
        className="flex items-end gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          apply();
        }}
      >
        {[
          { id: "price-min", label: t("filters.from"), value: min, set: setMin, placeholder: String(floor) },
          { id: "price-max", label: t("filters.to"), value: max, set: setMax, placeholder: String(ceil) },
        ].map((field) => (
          <label key={field.id} className="flex min-w-0 flex-1 flex-col gap-1 text-xs text-mute">
            {field.label} ({symbol})
            <input
              id={field.id}
              type="number"
              inputMode="numeric"
              min={0}
              value={field.value}
              placeholder={field.placeholder}
              onChange={(event) => field.set(event.target.value)}
              onBlur={() => apply()}
              className="h-10 w-full min-w-0 border border-line bg-paper px-2.5 text-sm text-ink tabular-nums outline-none focus:border-ink"
            />
          </label>
        ))}
        <button type="submit" className="sr-only">
          {t("filters.applyPrice")}
        </button>
      </form>
      {ceil > floor ? (
        <p className="text-xs text-mute" dir="ltr">
          <bdi>{formatMoney(String(floor), displayCurrency)}</bdi> – <bdi>{formatMoney(String(ceil), displayCurrency)}</bdi>
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="text-xs text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}

/**
 * Filter controls. Calls onChange(nextState) — the parent decides whether that
 * navigates immediately (desktop) or updates a draft (mobile sheet).
 */
export function FilterPanel({ state, facets, onChange, displayCurrency, usdRate }) {
  const t = useT();
  const set = (changes) => onChange({ ...state, ...changes, page: 1 });

  const sizes = [...new Set([...facets.sizes, ...state.size])];
  const colors = [...facets.colors];
  for (const name of state.color) if (!colors.some((color) => color.name.toLowerCase() === name)) colors.push({ name, hex: null });
  const materials = [...new Set([...facets.materials, ...state.material])];
  const highlights = [
    { key: "sale", label: t("filters.onSale"), count: facets.flags?.onSale },
    { key: "new", label: t("filters.newArrival"), count: facets.flags?.newArrival },
    { key: "best", label: t("filters.bestSeller"), count: facets.flags?.bestSeller },
    { key: "featured", label: t("filters.featured"), count: facets.flags?.featured },
  ].filter((item) => item.count > 0 || state.flags.includes(item.key));

  return (
    <div className="flex flex-col">
      {facets.subcategories.length ? (
        <Group id="filter-category" title={t("filters.category")} count={state.sub.length}>
          {facets.subcategories.map((sub) => (
            <CheckRow key={sub.slug} label={sub.name} count={sub.count} checked={state.sub.includes(sub.slug)} disabled={!sub.count && !state.sub.includes(sub.slug)} onChange={() => set({ sub: toggle(state.sub, sub.slug) })} />
          ))}
        </Group>
      ) : null}

      {facets.genders.length > 1 || state.gender.length ? (
        <Group id="filter-gender" title={t("filters.gender")} count={state.gender.length}>
          {facets.genders.map((gender) => {
            const value = gender.value.toLowerCase();
            return <CheckRow key={value} label={t(`filters.genders.${value}`)} count={gender.count} checked={state.gender.includes(value)} onChange={() => set({ gender: toggle(state.gender, value) })} />;
          })}
        </Group>
      ) : null}

      {sizes.length ? (
        <Group id="filter-size" title={t("filters.size")} count={state.size.length}>
          <div className="flex flex-wrap gap-2">
            {sizes.map((size) => {
              const active = state.size.includes(size);
              return (
                <button
                  key={size}
                  type="button"
                  aria-pressed={active}
                  onClick={() => set({ size: toggle(state.size, size) })}
                  className={cn(
                    "h-10 min-w-11 border px-3 text-sm transition-[background-color,color,border-color] duration-200 active:scale-[0.97]",
                    active ? "border-ink bg-ink text-paper" : "border-line hover:border-ink",
                  )}
                >
                  {size}
                </button>
              );
            })}
          </div>
        </Group>
      ) : null}

      {colors.length ? (
        <Group id="filter-color" title={t("filters.color")} count={state.color.length}>
          <div className="grid grid-cols-2 gap-x-3 gap-y-1">
            {colors.map((color) => {
              const value = color.name.toLowerCase();
              const active = state.color.includes(value);
              return (
                <button
                  key={value}
                  type="button"
                  aria-pressed={active}
                  onClick={() => set({ color: toggle(state.color, value) })}
                  className="group/swatch flex min-h-10 items-center gap-2.5 text-start text-sm"
                >
                  <span
                    aria-hidden="true"
                    className={cn(
                      "relative grid size-6 shrink-0 place-items-center rounded-full border transition-[box-shadow] duration-200",
                      active ? "border-ink shadow-[0_0_0_2px_var(--color-paper),0_0_0_3px_var(--color-ink)]" : "border-ink/15 group-hover/swatch:shadow-[0_0_0_2px_var(--color-paper),0_0_0_3px_var(--color-line)]",
                      !color.hex && "bg-sand",
                    )}
                    style={color.hex ? { backgroundColor: color.hex } : undefined}
                  >
                    {active ? <Icon name="check" strokeWidth={2.4} className={cn("size-3.5", isLight(color.hex) ? "text-ink" : "text-paper")} /> : null}
                  </span>
                  <span className={cn(active && "font-medium")}>{color.name}</span>
                </button>
              );
            })}
          </div>
        </Group>
      ) : null}

      <Group id="filter-price" title={t("filters.price")} count={state.min || state.max ? 1 : 0}>
        {/* key: remount with fresh inputs whenever the applied range or currency changes */}
        <PriceFilter key={`${state.min}|${state.max}|${state.currency}|${displayCurrency}`} state={state} facets={facets} displayCurrency={displayCurrency} usdRate={usdRate} onApply={({ min, max, currency }) => set({ min, max, currency })} />
      </Group>

      {materials.length ? (
        <Group id="filter-material" title={t("filters.material")} count={state.material.length} defaultOpen={false}>
          {materials.map((material) => (
            <CheckRow key={material} label={material} checked={state.material.includes(material)} onChange={() => set({ material: toggle(state.material, material) })} />
          ))}
        </Group>
      ) : null}

      <Group id="filter-availability" title={t("filters.availability")} count={state.inStock ? 1 : 0}>
        <CheckRow label={t("filters.inStock")} count={facets.inStock} checked={state.inStock} onChange={() => set({ inStock: !state.inStock })} />
      </Group>

      {highlights.length ? (
        <Group id="filter-highlights" title={t("filters.highlights")} count={state.flags.length}>
          {highlights.map((item) => (
            <CheckRow key={item.key} label={item.label} count={item.count} checked={state.flags.includes(item.key)} onChange={() => set({ flags: toggle(state.flags, item.key) })} />
          ))}
        </Group>
      ) : null}
    </div>
  );
}

function isLight(hex) {
  if (!hex) return true;
  const value = Number.parseInt(hex.slice(1), 16);
  const [r, g, b] = [(value >> 16) & 255, (value >> 8) & 255, value & 255];
  return 0.299 * r + 0.587 * g + 0.114 * b > 170;
}
