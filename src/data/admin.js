// Serialisers for admin Client Components: Prisma Decimal / Date → plain values.
import "server-only";

const money = (value) => (value === null || value === undefined ? null : value.toString());

export function toAdminImage(image) {
  return {
    id: image.id,
    url: image.url,
    publicId: image.publicId,
    alt: image.alt ?? "",
    width: image.width,
    height: image.height,
    sortOrder: image.sortOrder,
    isPrimary: image.isPrimary,
  };
}

/** Shape consumed by <ProductForm>. */
export function toAdminProductForm(product) {
  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    sku: product.sku ?? "",
    shortDescription: product.shortDescription ?? "",
    description: product.description ?? "",
    material: product.material ?? "",
    gender: product.gender,
    status: product.status,
    categoryId: product.categoryId,
    price: money(product.price),
    salePrice: money(product.salePrice) ?? "",
    featured: product.featured,
    newArrival: product.newArrival,
    bestSeller: product.bestSeller,
    onSale: product.onSale,
    seoTitle: product.seoTitle ?? "",
    seoDescription: product.seoDescription ?? "",
    hasOrders: (product._count?.orderItems ?? 0) > 0,
    variants: product.variants.map((variant) => ({
      id: variant.id,
      sku: variant.sku,
      size: variant.size ?? "",
      color: variant.color ?? "",
      colorHex: variant.colorHex ?? "",
      priceOverride: money(variant.priceOverride) ?? "",
      stock: variant.stock,
    })),
    images: product.images.map(toAdminImage),
  };
}

/** Departments with subcategories, for category pickers. */
export function toCategoryOptions(tree) {
  return tree.map((department) => ({
    id: department.id,
    name: department.name,
    status: department.status,
    children: department.children.map((child) => ({ id: child.id, name: child.name, status: child.status })),
  }));
}

export function toAdminCategoryTree(tree) {
  const node = (category) => ({
    id: category.id,
    name: category.name,
    slug: category.slug,
    description: category.description ?? "",
    status: category.status,
    imageUrl: category.imageUrl,
    parentId: category.parentId,
    productCount: category._count?.products ?? 0,
  });
  return tree.map((department) => ({ ...node(department), children: department.children.map(node) }));
}
