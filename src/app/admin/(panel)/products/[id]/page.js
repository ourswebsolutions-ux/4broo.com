import { notFound } from "next/navigation";
import { ProductForm } from "@/components/admin/products/ProductForm";
import { ProductStatusActions } from "@/components/admin/products/ProductStatusActions";
import { StatusBadge } from "@/components/admin/ui";
import { Button } from "@/components/ui/Button";
import { toAdminProductForm, toCategoryOptions } from "@/data/admin";
import { requireAdmin } from "@/lib/auth/guards";
import { NotFoundError } from "@/lib/errors";
import { listCategoryTree } from "@/services/categoryService";
import { getAdminProduct } from "@/services/productService";

export const metadata = { title: "Edit product" };

export default async function EditProductPage({ params }) {
  await requireAdmin();
  const { id } = await params;

  let product;
  try {
    product = await getAdminProduct(id);
  } catch (error) {
    if (error instanceof NotFoundError || error?.code === "VALIDATION_ERROR") notFound();
    throw error;
  }
  const categories = toCategoryOptions(await listCategoryTree({ includeHidden: true }));

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-2">
          <Button href="/admin/products" variant="link" className="self-start">
            ← All products
          </Button>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-display text-display-sm font-light">{product.name}</h1>
            <StatusBadge status={product.status} />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {product.status === "PUBLISHED" ? (
            <Button href={`/products/${product.slug}`} variant="secondary" size="sm" target="_blank" rel="noopener noreferrer">
              View in store
            </Button>
          ) : null}
          <ProductStatusActions product={{ id: product.id, name: product.name, status: product.status }} />
        </div>
      </header>
      {/* key forces a fresh form state after saves that change server data */}
      <ProductForm key={product.updatedAt.toISOString()} product={toAdminProductForm(product)} categories={categories} />
    </div>
  );
}
