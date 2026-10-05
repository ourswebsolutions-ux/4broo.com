import { ProductForm } from "@/components/admin/products/ProductForm";
import { Button } from "@/components/ui/Button";
import { toCategoryOptions } from "@/data/admin";
import { requireAdmin } from "@/lib/auth/guards";
import { listCategoryTree } from "@/services/categoryService";

export const metadata = { title: "New product" };

export default async function NewProductPage() {
  await requireAdmin();
  const categories = toCategoryOptions(await listCategoryTree({ includeHidden: true }));

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-2">
        <Button href="/admin/products" variant="link" className="self-start">
          ← All products
        </Button>
        <h1 className="font-display text-display-sm font-light">New product</h1>
      </header>
      <ProductForm categories={categories} />
    </div>
  );
}
