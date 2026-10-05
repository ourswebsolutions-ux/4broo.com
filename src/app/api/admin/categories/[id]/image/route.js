import { servicesConfig } from "@/config/server";
import { apiHandler } from "@/lib/api";
import { deleteImage, deleteImagesQuietly, uploadImage } from "@/lib/services/cloudinary";
import { readImageUpload } from "@/lib/uploads";
import { validate } from "@/lib/validation";
import { idSchema } from "@/lib/validation/schemas/common";
import { setCategoryImage } from "@/services/categoryService";

/** Admin-only: set/replace a category image (old asset removed after the DB update). */
export const POST = apiHandler(
  async ({ request, params }) => {
    const categoryId = validate(idSchema, params.id);
    const { buffer } = await readImageUpload(request);
    const uploaded = await uploadImage(buffer, { folder: servicesConfig.cloudinary.folders.categories });
    try {
      const { previousPublicId } = await setCategoryImage(categoryId, uploaded);
      await deleteImagesQuietly([previousPublicId]);
      return { image: { url: uploaded.url, publicId: uploaded.publicId } };
    } catch (error) {
      await deleteImage(uploaded.publicId).catch(() => {});
      throw error;
    }
  },
  { auth: "admin" },
);
