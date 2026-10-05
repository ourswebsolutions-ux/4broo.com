"use server";

// Admin product mutations. Every action is re-authorised server-side via runAdminAction.
import { revalidatePath } from "next/cache";
import { revalidateStorefront, runAdminAction } from "@/lib/actions";
import { ValidationError } from "@/lib/errors";
import { deleteImagesQuietly } from "@/lib/services/cloudinary";
import {
  createProduct,
  deleteProductImage,
  deleteProductSafely,
  getProductStatus,
  reorderProductImages,
  setPrimaryImage,
  setProductFlags,
  setProductStatus,
  updateImageAlt,
  updateProduct,
} from "@/services/productService";

const refreshAdmin = (productId) => {
  revalidatePath("/admin/products");
  if (productId) revalidatePath(`/admin/products/${productId}`);
  revalidateStorefront();
};

/**
 * Archiving and restoring are separate, confirmed actions (setProductStatusAction).
 * A normal Save may only switch between DRAFT and PUBLISHED, and saving an archived
 * product keeps it archived — so a form submit can never archive or unarchive by accident.
 */
async function resolveSaveStatus(productId, requested) {
  const current = productId ? await getProductStatus(productId) : null;
  if (current === "ARCHIVED") return "ARCHIVED";
  if (requested === "ARCHIVED") {
    throw new ValidationError("Use “Archive product” to archive.", { status: ["Archiving is a separate action — use “Archive product”."] });
  }
  return requested;
}

/** Create (productId = null) or update a product with its variants. */
export async function saveProductAction(productId, payload) {
  return runAdminAction("save product", async () => {
    const data = { ...payload, status: await resolveSaveStatus(productId, payload?.status) };
    const product = productId ? await updateProduct(productId, data) : await createProduct(data);
    refreshAdmin(product.id);
    return { id: product.id, slug: product.slug, status: product.status };
  });
}

export async function setProductStatusAction(productId, status) {
  return runAdminAction("set product status", async () => {
    const result = await setProductStatus(productId, status);
    refreshAdmin(productId);
    return result;
  });
}

export async function setProductFlagsAction(productId, flags) {
  return runAdminAction("set product flags", async () => {
    const result = await setProductFlags(productId, flags);
    refreshAdmin(productId);
    return result;
  });
}

/** Hard delete — refused when the product is referenced by any order (archive instead). */
export async function deleteProductAction(productId) {
  return runAdminAction("delete product", async () => {
    const { publicIds } = await deleteProductSafely(productId);
    await deleteImagesQuietly(publicIds); // after the DB commit
    refreshAdmin();
  });
}

export async function setPrimaryImageAction(productId, imageId) {
  return runAdminAction("set primary image", async () => {
    await setPrimaryImage(productId, imageId);
    refreshAdmin(productId);
  });
}

export async function reorderImagesAction(productId, orderedIds) {
  return runAdminAction("reorder images", async () => {
    await reorderProductImages(productId, Array.isArray(orderedIds) ? orderedIds : []);
    refreshAdmin(productId);
  });
}

export async function updateImageAltAction(productId, imageId, alt) {
  return runAdminAction("update image alt", async () => {
    await updateImageAlt(productId, imageId, String(alt ?? ""));
    refreshAdmin(productId);
  });
}

export async function deleteImageAction(productId, imageId) {
  return runAdminAction("delete image", async () => {
    const { publicId } = await deleteProductImage(productId, imageId);
    await deleteImagesQuietly([publicId]); // after the DB commit
    refreshAdmin(productId);
  });
}
