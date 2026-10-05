// Category data access. Two-level tree: departments (no parent) → subcategories.
import "server-only";
import { getDb, withTransaction } from "../lib/db.js";
import { ConflictError, NotFoundError, ValidationError } from "../lib/errors.js";
import { localize, translationsFor } from "../i18n/content.js";
import { DEFAULT_LOCALE } from "../i18n/config.js";
import { validate } from "../lib/validation/index.js";
import { categoryInputSchema } from "../lib/validation/schemas/catalog.js";
import { idSchema } from "../lib/validation/schemas/common.js";

const TRANSLATABLE = ["name", "description"];
const ORDER = [{ sortOrder: "asc" }, { name: "asc" }];

/** Departments with their subcategories (ACTIVE only unless includeHidden). */
export async function listCategoryTree({ includeHidden = false, locale = DEFAULT_LOCALE } = {}) {
  const status = includeHidden ? undefined : "ACTIVE";
  const translations = translationsFor(locale);
  const departments = await getDb().category.findMany({
    where: { parentId: null, status },
    orderBy: ORDER,
    include: {
      ...(translations && { translations }),
      children: { where: { status }, orderBy: ORDER, include: translations ? { translations } : undefined },
    },
  });

  return departments.map((department) => ({
    ...localize(department, locale, TRANSLATABLE),
    children: department.children.map((child) => localize(child, locale, TRANSLATABLE)),
  }));
}

export async function getCategoryBySlug(slug, { locale = DEFAULT_LOCALE, includeHidden = false } = {}) {
  const translations = translationsFor(locale);
  const category = await getDb().category.findUnique({
    where: { slug },
    include: { parent: true, ...(translations && { translations }) },
  });
  if (!category || (!includeHidden && category.status !== "ACTIVE")) return null;
  return localize(category, locale, TRANSLATABLE);
}

/**
 * Parent rules (prevent invalid trees):
 *  - a category cannot be its own parent;
 *  - the parent must exist and be a top-level department (max depth 2, so no cycles);
 *  - a category that already has subcategories cannot itself become a subcategory.
 */
async function assertValidParent(db, { categoryId, parentId }) {
  if (!parentId) return;
  if (parentId === categoryId) throw new ValidationError(undefined, { parentId: ["A category cannot be its own parent."] });

  const parent = await db.category.findUnique({ where: { id: parentId }, select: { id: true, parentId: true } });
  if (!parent) throw new ValidationError(undefined, { parentId: ["Parent category not found."] });
  if (parent.parentId) throw new ValidationError(undefined, { parentId: ["Subcategories can only be placed under a top-level department."] });

  if (categoryId) {
    const childCount = await db.category.count({ where: { parentId: categoryId } });
    if (childCount) throw new ValidationError(undefined, { parentId: ["This category has subcategories and must stay top-level."] });
  }
}

export async function createCategory(input) {
  const data = validate(categoryInputSchema, input);
  const db = getDb();
  await assertValidParent(db, { parentId: data.parentId });
  try {
    return await db.category.create({ data });
  } catch (error) {
    if (error?.code === "P2002") throw new ConflictError("A category with this slug already exists.");
    throw error;
  }
}

export async function updateCategory(id, input) {
  // Only apply fields the caller actually sent (schema defaults must not overwrite e.g. sortOrder).
  const parsed = validate(categoryInputSchema.partial(), input);
  const data = Object.fromEntries(Object.entries(parsed).filter(([key]) => key in input));
  const db = getDb();
  const existing = await db.category.findUnique({ where: { id }, select: { id: true } });
  if (!existing) throw new NotFoundError("Category not found.");
  if ("parentId" in data) await assertValidParent(db, { categoryId: id, parentId: data.parentId });
  try {
    return await db.category.update({ where: { id }, data });
  } catch (error) {
    if (error?.code === "P2002") throw new ConflictError("A category with this slug already exists.");
    throw error;
  }
}

// ─── Admin ───────────────────────────────────────────────────────────────────

/** Full tree for the admin (hidden included) with product counts. */
export async function listCategoriesForAdmin() {
  return getDb().category.findMany({
    where: { parentId: null },
    orderBy: ORDER,
    include: {
      _count: { select: { products: true } },
      children: { orderBy: ORDER, include: { _count: { select: { products: true } } } },
    },
  });
}

export async function setCategoryStatus(id, status) {
  const data = validate(categoryInputSchema.pick({ status: true }), { status });
  return getDb().category.update({ where: { id: validate(idSchema, id) }, data, select: { id: true, status: true } });
}

/** Move a category one place up/down among its siblings (swaps sortOrder atomically). */
export async function moveCategory(id, direction) {
  const categoryId = validate(idSchema, id);
  if (!["up", "down"].includes(direction)) throw new ValidationError("Invalid direction.");

  return withTransaction(async (tx) => {
    const category = await tx.category.findUnique({ where: { id: categoryId }, select: { id: true, parentId: true } });
    if (!category) throw new NotFoundError("Category not found.");
    const siblings = await tx.category.findMany({ where: { parentId: category.parentId }, orderBy: ORDER, select: { id: true } });

    const index = siblings.findIndex((item) => item.id === categoryId);
    const target = direction === "up" ? index - 1 : index + 1;
    if (target < 0 || target >= siblings.length) return;

    [siblings[index], siblings[target]] = [siblings[target], siblings[index]];
    // Re-number all siblings so legacy duplicate sortOrders are normalised too.
    for (const [position, sibling] of siblings.entries()) {
      await tx.category.update({ where: { id: sibling.id }, data: { sortOrder: position } });
    }
  });
}

/** Replace a category image. Returns the previous Cloudinary public id (delete it after commit). */
export async function setCategoryImage(id, image) {
  const categoryId = validate(idSchema, id);
  const db = getDb();
  const category = await db.category.findUnique({ where: { id: categoryId }, select: { imagePublicId: true } });
  if (!category) throw new NotFoundError("Category not found.");
  await db.category.update({
    where: { id: categoryId },
    data: { imageUrl: image?.url ?? null, imagePublicId: image?.publicId ?? null },
  });
  return { previousPublicId: category.imagePublicId };
}

/** Delete only empty categories (no subcategories, no products). */
export async function deleteCategorySafely(id) {
  const categoryId = validate(idSchema, id);
  return withTransaction(async (tx) => {
    const category = await tx.category.findUnique({
      where: { id: categoryId },
      select: { imagePublicId: true, _count: { select: { children: true, products: true } } },
    });
    if (!category) throw new NotFoundError("Category not found.");
    if (category._count.children) throw new ConflictError("Remove or move its subcategories first.");
    if (category._count.products) throw new ConflictError("This category still has products. Move them or hide the category instead.");
    await tx.category.delete({ where: { id: categoryId } });
    return { publicId: category.imagePublicId };
  });
}

/** Category suggestions for search (ACTIVE only, localized). */
export async function searchCategories(text, { locale = DEFAULT_LOCALE, take = 5 } = {}) {
  const term = String(text ?? "").trim().slice(0, 80);
  if (term.length < 2) return [];
  const translations = translationsFor(locale);
  const rows = await getDb().category.findMany({
    where: {
      status: "ACTIVE",
      OR: [{ name: { contains: term } }, { slug: { contains: term.toLowerCase().replace(/\s+/g, "-") } }, { translations: { some: { name: { contains: term } } } }],
    },
    orderBy: [{ parentId: "asc" }, { sortOrder: "asc" }],
    take,
    include: { parent: { select: { name: true } }, ...(translations && { translations }) },
  });
  return rows.map((row) => {
    const local = localize(row, locale, TRANSLATABLE);
    return { slug: row.slug, name: local.name, parent: row.parent?.name ?? null };
  });
}
