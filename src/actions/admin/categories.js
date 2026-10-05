"use server";

// Admin category mutations. Every action is re-authorised server-side via runAdminAction.
import { revalidatePath } from "next/cache";
import { revalidateStorefront, runAdminAction } from "@/lib/actions";
import { deleteImagesQuietly } from "@/lib/services/cloudinary";
import {
  createCategory,
  deleteCategorySafely,
  moveCategory,
  setCategoryImage,
  setCategoryStatus,
  updateCategory,
} from "@/services/categoryService";

const refresh = () => {
  revalidatePath("/admin/categories");
  revalidatePath("/admin/products");
  revalidateStorefront();
};

export async function saveCategoryAction(categoryId, payload) {
  return runAdminAction("save category", async () => {
    const category = categoryId ? await updateCategory(categoryId, payload) : await createCategory(payload);
    refresh();
    return { id: category.id, slug: category.slug };
  });
}

export async function setCategoryStatusAction(categoryId, status) {
  return runAdminAction("set category status", async () => {
    await setCategoryStatus(categoryId, status);
    refresh();
  });
}

export async function moveCategoryAction(categoryId, direction) {
  return runAdminAction("move category", async () => {
    await moveCategory(categoryId, direction);
    refresh();
  });
}

export async function removeCategoryImageAction(categoryId) {
  return runAdminAction("remove category image", async () => {
    const { previousPublicId } = await setCategoryImage(categoryId, null);
    await deleteImagesQuietly([previousPublicId]);
    refresh();
  });
}

export async function deleteCategoryAction(categoryId) {
  return runAdminAction("delete category", async () => {
    const { publicId } = await deleteCategorySafely(categoryId);
    await deleteImagesQuietly([publicId]);
    refresh();
  });
}
