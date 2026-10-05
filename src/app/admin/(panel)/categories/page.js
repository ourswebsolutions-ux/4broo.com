import { CategoryManager } from "@/components/admin/categories/CategoryManager";
import { toAdminCategoryTree } from "@/data/admin";
import { requireAdmin } from "@/lib/auth/guards";
import { listCategoriesForAdmin } from "@/services/categoryService";

export const metadata = { title: "Categories" };

export default async function AdminCategoriesPage() {
  await requireAdmin();
  const tree = toAdminCategoryTree(await listCategoriesForAdmin());

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-2">
        <p className="eyebrow text-mute">Catalogue</p>
        <h1 className="font-display text-display-sm font-light">Categories</h1>
        <p className="max-w-xl text-sm text-subtle">
          Departments and their subcategories drive the storefront collections. Hidden categories (and their products) are not shown to customers.
        </p>
      </header>
      <CategoryManager tree={tree} />
    </div>
  );
}
