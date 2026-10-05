"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { saveProductAction } from "@/actions/admin/products";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { useToast } from "@/components/ui/Toast";
import { formatMoney, fromMinor, toMinor } from "@/lib/currency/money";
import { Section, SelectField, StatusBadge, TextArea, TextField, Toggle } from "../ui";
import { ImageManager } from "./ImageManager";
import { emptyVariant, VariantsEditor } from "./VariantsEditor";

const GENDERS = [
  { value: "MEN", label: "Men" },
  { value: "WOMEN", label: "Women" },
  { value: "KIDS", label: "Kids" },
  { value: "UNISEX", label: "Unisex" },
];
// Archived is not offered here: archiving/restoring are separate, confirmed actions.
const STATUSES = [
  { value: "DRAFT", label: "Draft — hidden from the store" },
  { value: "PUBLISHED", label: "Published — visible in the store" },
];
const FLAGS = [
  { key: "featured", label: "Featured", description: "Highlighted in curated sections." },
  { key: "newArrival", label: "New arrival", description: "Shown in New Arrivals." },
  { key: "bestSeller", label: "Best seller", description: "Shown in Best Sellers." },
  { key: "onSale", label: "On sale", description: "Uses the sale price; requires a sale price." },
];

const slugify = (value) =>
  value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 191);

const isMoney = (value) => /^\d{1,10}(\.\d{1,2})?$/.test(String(value ?? "").trim());

const EMPTY = {
  name: "",
  slug: "",
  sku: "",
  shortDescription: "",
  description: "",
  material: "",
  gender: "UNISEX",
  status: "DRAFT",
  categoryId: "",
  price: "",
  salePrice: "",
  featured: false,
  newArrival: false,
  bestSeller: false,
  onSale: false,
  seoTitle: "",
  seoDescription: "",
  variants: [emptyVariant()],
  images: [],
};

/**
 * Create / edit product. All validation is repeated server-side; server field
 * errors are mapped back onto the matching inputs.
 * @param {{ product?: object, categories: Array<{ id: string, name: string, children: Array<{ id: string, name: string }> }> }} props
 */
export function ProductForm({ product, categories }) {
  const router = useRouter();
  const toast = useToast();
  const imagesRef = useRef(null);
  const isNew = !product;
  const [form, setForm] = useState(() => (product ? { ...EMPTY, ...product } : EMPTY));
  const [slugTouched, setSlugTouched] = useState(Boolean(product));
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState(null);
  const [discount, setDiscount] = useState("");
  const [saving, startSaving] = useTransition();
  const submitting = useRef(false); // synchronous double-submit guard

  // Resolve department/subcategory from the stored categoryId.
  const department =
    categories.find((item) => item.id === form.categoryId) ?? categories.find((item) => item.children.some((child) => child.id === form.categoryId));
  const subcategoryId = department && department.id !== form.categoryId ? form.categoryId : "";

  const set = (changes) => setForm((current) => ({ ...current, ...changes }));
  const fieldError = (name) => errors[name];

  const applyDiscount = () => {
    const percent = Number(discount);
    if (!isMoney(form.price) || !(percent > 0 && percent < 100)) return;
    // Exact integer maths in paisa, rounded to whole rupees.
    const discounted = (toMinor(form.price) * BigInt(Math.round((100 - percent) * 100))) / 10000n;
    const wholeRupees = ((discounted + 50n) / 100n) * 100n;
    set({ salePrice: fromMinor(wholeRupees), onSale: true });
  };

  const submit = (event) => {
    event.preventDefault();
    if (submitting.current) return;
    submitting.current = true;
    setErrors({});
    setFormError(null);

    const payload = {
      ...Object.fromEntries(Object.entries(form).filter(([field]) => !["id", "images", "hasOrders"].includes(field))),
      sku: form.sku.trim() || null,
      salePrice: form.salePrice === "" ? null : form.salePrice,
      variants: form.variants.map((variant) => ({
        ...(variant.id && { id: variant.id }),
        sku: variant.sku,
        size: variant.size,
        color: variant.color,
        colorHex: variant.colorHex,
        priceOverride: variant.priceOverride === "" ? null : variant.priceOverride,
        stock: variant.stock === "" ? 0 : Number(variant.stock),
      })),
    };

    startSaving(async () => {
      let result;
      try {
        result = await saveProductAction(product?.id ?? null, payload);
      } catch {
        result = { ok: false, message: "The product could not be saved. Check your connection and try again." };
      } finally {
        submitting.current = false;
      }
      if (!result.ok) {
        setErrors(result.fieldErrors ?? {});
        setFormError(result.message);
        toast.error(result.message);
        document.querySelector("[aria-invalid='true']")?.focus();
        return;
      }
      if (isNew) {
        if (imagesRef.current?.hasPending()) await imagesRef.current.uploadPending(result.data.id);
        toast.success("Product created.");
        router.replace(`/admin/products/${result.data.id}`);
      } else {
        toast.success("Product saved.");
        router.refresh();
      }
    });
  };

  const pricePreview = isMoney(form.price) ? formatMoney(form.price, "PKR") : null;

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-6 pb-28">
      {formError && !Object.keys(errors).length ? <Alert tone="error">{formError}</Alert> : null}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="flex min-w-0 flex-col gap-6">
          <Section id="basic" title="Basic information">
            <div className="grid gap-5 sm:grid-cols-2">
              <TextField
                id="name"
                label="Product name"
                required
                maxLength={191}
                value={form.name}
                error={fieldError("name")}
                onChange={(event) => set({ name: event.target.value, ...(!slugTouched && { slug: slugify(event.target.value) }) })}
                className="sm:col-span-2"
              />
              <TextField
                id="slug"
                label="Slug"
                required
                maxLength={191}
                value={form.slug}
                error={fieldError("slug")}
                hint={`URL: /products/${form.slug || "…"}`}
                onChange={(event) => {
                  setSlugTouched(true);
                  set({ slug: slugify(event.target.value) });
                }}
              />
              <TextField id="sku" label="Product SKU (style code)" maxLength={64} value={form.sku} error={fieldError("sku")} hint="Optional. Variants have their own SKUs." onChange={(event) => set({ sku: event.target.value.toUpperCase() })} />
              <SelectField id="gender" label="Gender" value={form.gender} error={fieldError("gender")} onChange={(event) => set({ gender: event.target.value })}>
                {GENDERS.map((gender) => (
                  <option key={gender.value} value={gender.value}>
                    {gender.label}
                  </option>
                ))}
              </SelectField>
              <TextField id="material" label="Material / fabric" maxLength={191} value={form.material} error={fieldError("material")} placeholder="e.g. 100% cotton" onChange={(event) => set({ material: event.target.value })} />
              <TextArea id="shortDescription" label="Short description" maxLength={500} showCount rows={2} value={form.shortDescription} error={fieldError("shortDescription")} hint="Shown on the product page under the name." onChange={(event) => set({ shortDescription: event.target.value })} className="sm:col-span-2" />
              <TextArea id="description" label="Description" rows={7} value={form.description} error={fieldError("description")} onChange={(event) => set({ description: event.target.value })} className="sm:col-span-2" />
            </div>
          </Section>

          <Section id="pricing" title="Pricing" description="All prices are in PKR. USD is calculated automatically for display.">
            <div className="grid gap-5 sm:grid-cols-3">
              <TextField id="price" label="Original price (PKR)" required inputMode="decimal" value={form.price} error={fieldError("price")} hint={pricePreview ?? "e.g. 12500"} onChange={(event) => set({ price: event.target.value.trim() })} />
              <TextField
                id="salePrice"
                label="Sale price (PKR)"
                inputMode="decimal"
                value={form.salePrice}
                error={fieldError("salePrice")}
                hint={isMoney(form.salePrice) ? formatMoney(form.salePrice, "PKR") : "Optional — must be lower than the original."}
                onChange={(event) => set({ salePrice: event.target.value.trim(), ...(event.target.value.trim() === "" && { onSale: false }) })}
              />
              <div className="flex flex-col gap-1.5">
                <label htmlFor="discount" className="text-[0.8125rem] font-medium">
                  Discount helper (%)
                </label>
                <div className="flex gap-2">
                  <input id="discount" inputMode="decimal" value={discount} onChange={(event) => setDiscount(event.target.value)} placeholder="20" className="h-11 w-full min-w-0 border border-line bg-paper px-3.5 outline-none focus:border-ink" />
                  <Button variant="secondary" size="sm" className="h-11" onClick={applyDiscount} disabled={!isMoney(form.price) || !(Number(discount) > 0 && Number(discount) < 100)}>
                    Apply
                  </Button>
                </div>
                <p className="text-xs text-mute">Sets the sale price, rounded to whole rupees.</p>
              </div>
            </div>
          </Section>

          <Section id="variants" title="Variants" description="Size and colour are optional (e.g. perfumes, watches). Each variant needs a unique SKU.">
            <VariantsEditor variants={form.variants} onChange={(variants) => set({ variants })} errors={errors} baseSku={form.sku || form.slug} />
          </Section>

          <Section id="images" title="Images" description="Upload as many images as needed: front, back, side, details, on model…">
            <ImageManager ref={imagesRef} productId={product?.id ?? null} productName={form.name} initialImages={form.images} />
          </Section>

          <Section id="seo" title="SEO" description="Optional. When empty, the product name and short description are used.">
            <div className="grid gap-5">
              <TextField id="seoTitle" label="SEO title" maxLength={70} showCount value={form.seoTitle} error={fieldError("seoTitle")} placeholder={form.name} onChange={(event) => set({ seoTitle: event.target.value })} />
              <TextArea id="seoDescription" label="SEO description" maxLength={170} showCount rows={3} value={form.seoDescription} error={fieldError("seoDescription")} placeholder={form.shortDescription} onChange={(event) => set({ seoDescription: event.target.value })} />
            </div>
          </Section>
        </div>

        <aside className="flex min-w-0 flex-col gap-6">
          <Section id="publishing" title="Publishing">
            {form.status === "ARCHIVED" ? (
              <p className="text-sm leading-relaxed text-subtle">
                Archived — hidden from the store and kept for records. Edits are saved without publishing; use “Restore product” at the top of the page to make it live again.
              </p>
            ) : (
              <SelectField id="status" label="Status" value={form.status} error={fieldError("status")} onChange={(event) => set({ status: event.target.value })}>
                {STATUSES.map((status) => (
                  <option key={status.value} value={status.value}>
                    {status.label}
                  </option>
                ))}
              </SelectField>
            )}
            {product?.hasOrders ? <p className="mt-3 text-xs text-mute">This product appears in orders, so it can be archived but not deleted.</p> : null}
          </Section>

          <Section id="category" title="Category">
            <div className="flex flex-col gap-5">
              <SelectField
                id="department"
                label="Category"
                required
                value={department?.id ?? ""}
                error={fieldError("categoryId")}
                onChange={(event) => set({ categoryId: event.target.value })}
              >
                <option value="" disabled>
                  Choose a category
                </option>
                {categories.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                    {item.status === "HIDDEN" ? " (hidden)" : ""}
                  </option>
                ))}
              </SelectField>
              <SelectField
                id="subcategory"
                label="Subcategory"
                value={subcategoryId}
                disabled={!department?.children.length}
                hint={department && !department.children.length ? "This category has no subcategories." : "Optional."}
                onChange={(event) => set({ categoryId: event.target.value || department.id })}
              >
                <option value="">None</option>
                {department?.children.map((child) => (
                  <option key={child.id} value={child.id}>
                    {child.name}
                    {child.status === "HIDDEN" ? " (hidden)" : ""}
                  </option>
                ))}
              </SelectField>
            </div>
          </Section>

          <Section id="flags" title="Product flags">
            <div className="-my-3 divide-y divide-line">
              {FLAGS.map((flag) => (
                <Toggle
                  key={flag.key}
                  id={`flag-${flag.key}`}
                  label={flag.label}
                  description={flag.description}
                  checked={form[flag.key]}
                  disabled={flag.key === "onSale" && !isMoney(form.salePrice)}
                  onChange={(checked) => set({ [flag.key]: checked })}
                />
              ))}
            </div>
            {fieldError("onSale") ? <p className="mt-2 text-xs text-danger">{fieldError("onSale")}</p> : null}
          </Section>
        </aside>
      </div>

      {/* Sticky save bar */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-paper/95 backdrop-blur-sm lg:start-64">
        <div className="flex items-center justify-between gap-4 px-4 py-3 sm:px-8 lg:px-14">
          <div className="flex min-w-0 items-center gap-3 text-sm">
            <StatusBadge status={form.status} />
            <span className="truncate text-mute">{form.name || "Untitled product"}</span>
          </div>
          <div className="flex items-center gap-3">
            {saving ? <Spinner label="Saving" className="text-mute" /> : null}
            <Button type="submit" disabled={saving}>
              {isNew ? "Create product" : "Save changes"}
            </Button>
          </div>
        </div>
      </div>
    </form>
  );
}
