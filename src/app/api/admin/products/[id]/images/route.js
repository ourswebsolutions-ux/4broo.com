import { servicesConfig } from "@/config/server";
import { apiHandler } from "@/lib/api";
import { getDb } from "@/lib/db";
import { NotFoundError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { deleteImage, uploadImage } from "@/lib/services/cloudinary";
import { readImageUpload } from "@/lib/uploads";
import { validate } from "@/lib/validation";
import { idSchema } from "@/lib/validation/schemas/common";
import { addProductImage } from "@/services/productService";

/**
 * Admin-only: upload ONE product image (the admin UI sends multiple files as
 * parallel requests so each has its own progress and error). Order of work:
 * validate → upload to Cloudinary → insert row. If the insert fails, the
 * uploaded asset is removed so no orphaned/broken record or file remains.
 */
export const POST = apiHandler(
  async ({ request, params }) => {
    const productId = validate(idSchema, params.id);
    const product = await getDb().product.findUnique({ where: { id: productId }, select: { id: true, name: true } });
    if (!product) throw new NotFoundError("Product not found.");

    const { buffer, fields } = await readImageUpload(request);
    const uploaded = await uploadImage(buffer, { folder: `${servicesConfig.cloudinary.folders.products}/${productId}` });

    try {
      const image = await addProductImage(productId, {
        url: uploaded.url,
        publicId: uploaded.publicId,
        alt: fields.alt || product.name,
        width: uploaded.width,
        height: uploaded.height,
      });
      return { image };
    } catch (error) {
      await deleteImage(uploaded.publicId).catch((cleanupError) =>
        logger.error("Could not remove Cloudinary asset after failed DB insert", { publicId: uploaded.publicId, error: cleanupError }),
      );
      throw error;
    }
  },
  { auth: "admin" },
);
