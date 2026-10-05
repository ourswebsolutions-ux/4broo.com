"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/utils/cn";

const CELL = "h-10 w-full border bg-paper px-2.5 text-sm outline-none focus:border-ink";
const key = (variant) => `${variant.size.trim().toLowerCase()}|${variant.color.trim().toLowerCase()}`;
const skuPart = (value) => value.trim().toUpperCase().replace(/[^A-Z0-9]+/g, "-").replace(/^-|-$/g, "");

export const emptyVariant = () => ({ id: undefined, sku: "", size: "", color: "", colorHex: "", priceOverride: "", stock: 0 });

/**
 * Variant rows (size / colour / hex / SKU / price override / stock) with a
 * combination generator. Size and colour may be blank (perfumes, watches…).
 * Duplicate combinations and SKUs are highlighted before the server rejects them.
 */
export function VariantsEditor({ variants, onChange, errors = {}, baseSku }) {
  const [sizesInput, setSizesInput] = useState("");
  const [colorsInput, setColorsInput] = useState("");

  const duplicates = useMemo(() => {
    const combos = new Map();
    const skus = new Map();
    variants.forEach((variant) => {
      combos.set(key(variant), (combos.get(key(variant)) ?? 0) + 1);
      if (variant.sku) skus.set(variant.sku.toUpperCase(), (skus.get(variant.sku.toUpperCase()) ?? 0) + 1);
    });
    return { combo: (variant) => combos.get(key(variant)) > 1, sku: (variant) => variant.sku && skus.get(variant.sku.toUpperCase()) > 1 };
  }, [variants]);

  const update = (index, changes) => onChange(variants.map((variant, i) => (i === index ? { ...variant, ...changes } : variant)));
  const removeAt = (index) => onChange(variants.filter((_, i) => i !== index));
  const totalStock = variants.reduce((sum, variant) => sum + (Number(variant.stock) || 0), 0);

  const generate = () => {
    const sizes = sizesInput.split(",").map((value) => value.trim()).filter(Boolean);
    const colors = colorsInput
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean)
      .map((value) => {
        const match = value.match(/^(.*?)\s*(#[0-9a-f]{6})?$/i);
        return { name: match[1].trim(), hex: match[2]?.toUpperCase() ?? "" };
      });
    const sizeList = sizes.length ? sizes : [""];
    const colorList = colors.length ? colors : [{ name: "", hex: "" }];
    const existing = new Set(variants.map(key));
    const base = skuPart(baseSku || "SKU");
    const created = [];

    for (const color of colorList) {
      for (const size of sizeList) {
        const variant = { ...emptyVariant(), size, color: color.name, colorHex: color.hex };
        if (existing.has(key(variant))) continue;
        variant.sku = [base, skuPart(size), skuPart(color.name)].filter(Boolean).join("-");
        existing.add(key(variant));
        created.push(variant);
      }
    }
    onChange([...variants.filter((variant) => variant.sku || variant.size || variant.color || variant.id), ...created]);
    setSizesInput("");
    setColorsInput("");
  };

  return (
    <div className="flex flex-col gap-5">
      <details className="border border-line bg-bone/40 px-4 py-3">
        <summary className="cursor-pointer text-sm font-medium">Generate combinations</summary>
        <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <label className="flex flex-col gap-1.5 text-xs font-medium">
            Sizes (comma separated)
            <input value={sizesInput} onChange={(event) => setSizesInput(event.target.value)} placeholder="S, M, L, XL" className={cn(CELL, "border-line")} />
          </label>
          <label className="flex flex-col gap-1.5 text-xs font-medium">
            Colours (name and optional hex)
            <input value={colorsInput} onChange={(event) => setColorsInput(event.target.value)} placeholder="Black #0B0B0A, White #FFFFFF" className={cn(CELL, "border-line")} />
          </label>
          <Button variant="secondary" size="sm" onClick={generate} disabled={!sizesInput.trim() && !colorsInput.trim()}>
            Add combinations
          </Button>
        </div>
        <p className="mt-2 text-xs text-mute">Existing combinations are skipped. SKUs are generated from the product SKU (or slug) and can be edited.</p>
      </details>

      {/* Phones: each variant is a stacked, labelled card. Tablet+: a compact table. */}
      <div className="md:overflow-x-auto">
        <table className="block w-full text-sm md:table md:min-w-[46rem]">
          <thead className="hidden md:table-header-group">
            <tr className="text-start text-xs text-mute">
              <th scope="col" className="pb-2 pe-2 text-start font-medium">Size</th>
              <th scope="col" className="pb-2 pe-2 text-start font-medium">Colour</th>
              <th scope="col" className="w-36 pb-2 pe-2 text-start font-medium">Hex</th>
              <th scope="col" className="pb-2 pe-2 text-start font-medium">SKU *</th>
              <th scope="col" className="w-32 pb-2 pe-2 text-start font-medium">Price override</th>
              <th scope="col" className="w-24 pb-2 pe-2 text-start font-medium">Stock</th>
              <th scope="col" className="w-10 pb-2"><span className="sr-only">Remove</span></th>
            </tr>
          </thead>
          <tbody className="flex flex-col gap-3 md:table-row-group">
            {variants.map((variant, index) => {
              const err = (field) => errors[`variants.${index}.${field}`] ?? errors[`variants.${index}`];
              const comboDuplicate = duplicates.combo(variant);
              return (
                <tr key={variant.id ?? `new-${index}`} className="grid grid-cols-2 gap-x-3 gap-y-2 border border-line p-3 align-top md:table-row md:border-0 md:p-0">
                  <td className="block md:table-cell md:pb-2 md:pe-2">
                    <span aria-hidden="true" className="mb-1 block text-xs text-mute md:hidden">Size</span>
                    <input aria-label={`Variant ${index + 1} size`} value={variant.size} maxLength={20} onChange={(event) => update(index, { size: event.target.value })} placeholder="—" className={cn(CELL, comboDuplicate ? "border-danger" : "border-line")} />
                  </td>
                  <td className="block md:table-cell md:pb-2 md:pe-2">
                    <span aria-hidden="true" className="mb-1 block text-xs text-mute md:hidden">Colour</span>
                    <input aria-label={`Variant ${index + 1} colour`} value={variant.color} maxLength={40} onChange={(event) => update(index, { color: event.target.value })} placeholder="—" className={cn(CELL, comboDuplicate ? "border-danger" : "border-line")} />
                  </td>
                  <td className="col-span-2 block md:table-cell md:pb-2 md:pe-2">
                    <span aria-hidden="true" className="mb-1 block text-xs text-mute md:hidden">Colour hex</span>
                    <div className="flex items-center gap-1.5">
                      <input type="color" aria-label={`Variant ${index + 1} colour picker`} value={/^#[0-9a-f]{6}$/i.test(variant.colorHex) ? variant.colorHex : "#000000"} onChange={(event) => update(index, { colorHex: event.target.value.toUpperCase() })} className="h-10 w-10 shrink-0 cursor-pointer border border-line bg-paper p-1" />
                      <input aria-label={`Variant ${index + 1} hex`} value={variant.colorHex} maxLength={7} onChange={(event) => update(index, { colorHex: event.target.value })} placeholder="#000000" className={cn(CELL, err("colorHex") ? "border-danger" : "border-line")} />
                    </div>
                  </td>
                  <td className="col-span-2 block md:table-cell md:pb-2 md:pe-2">
                    <span aria-hidden="true" className="mb-1 block text-xs text-mute md:hidden">SKU *</span>
                    <input aria-label={`Variant ${index + 1} SKU`} value={variant.sku} maxLength={64} onChange={(event) => update(index, { sku: event.target.value.toUpperCase() })} className={cn(CELL, "font-mono text-xs", err("sku") || duplicates.sku(variant) ? "border-danger" : "border-line")} />
                  </td>
                  <td className="block md:table-cell md:pb-2 md:pe-2">
                    <span aria-hidden="true" className="mb-1 block text-xs text-mute md:hidden">Price override (PKR)</span>
                    <input aria-label={`Variant ${index + 1} price override (PKR)`} inputMode="decimal" value={variant.priceOverride} onChange={(event) => update(index, { priceOverride: event.target.value })} placeholder="—" className={cn(CELL, err("priceOverride") ? "border-danger" : "border-line")} />
                  </td>
                  <td className="block md:table-cell md:pb-2 md:pe-2">
                    <span aria-hidden="true" className="mb-1 block text-xs text-mute md:hidden">Stock</span>
                    <input aria-label={`Variant ${index + 1} stock`} type="number" min={0} step={1} value={variant.stock} onChange={(event) => update(index, { stock: event.target.value === "" ? "" : Math.max(0, Math.floor(Number(event.target.value))) })} className={cn(CELL, "tabular-nums", err("stock") ? "border-danger" : "border-line")} />
                  </td>
                  <td className="col-span-2 flex justify-end md:table-cell md:pb-2">
                    <button type="button" onClick={() => removeAt(index)} disabled={variants.length === 1} aria-label={`Remove variant ${index + 1}`} className="grid size-10 place-items-center text-mute hover:text-danger disabled:opacity-30">
                      <Icon name="trash" className="size-4" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {Object.entries(errors)
        .filter(([field]) => field.startsWith("variants"))
        .map(([field, messages]) => (
          <p key={field} className="text-xs text-danger">
            {field === "variants" ? "" : `Variant ${Number(field.split(".")[1]) + 1}: `}
            {[].concat(messages).join(" ")}
          </p>
        ))}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button variant="secondary" size="sm" onClick={() => onChange([...variants, emptyVariant()])}>
          <Icon name="plus" className="size-4" />
          Add variant
        </Button>
        <p className="text-sm text-subtle">
          {variants.length} variant{variants.length === 1 ? "" : "s"} · total stock <span className="tabular-nums font-medium text-ink">{totalStock}</span>
        </p>
      </div>
    </div>
  );
}
