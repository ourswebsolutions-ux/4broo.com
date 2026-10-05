// Cloudinary image management. Server-only — the API secret never leaves the server.
//
// Supports: uploads (single/multiple), deletion, replacement, signed direct
// uploads for the future admin UI, and connectivity checks. Delivery URL
// transformations (resize, f_auto, q_auto) live in src/utils/cloudinary-image.js
// because they need no credentials.
import "server-only";
import { v2 as cloudinary } from "cloudinary";
import { servicesConfig } from "../../config/server.js";
import { AppError, ExternalServiceError, ValidationError } from "../errors.js";
import { getCloudinaryEnv } from "../env.js";
import { logger } from "../logger.js";

let configured = false;

function getCloudinary() {
  if (!configured) {
    const env = getCloudinaryEnv();
    cloudinary.config({
      cloud_name: env.CLOUDINARY_CLOUD_NAME,
      api_key: env.CLOUDINARY_API_KEY,
      api_secret: env.CLOUDINARY_API_SECRET,
      secure: true,
      // Optional regional API endpoint (e.g. https://api-eu.cloudinary.com).
      ...(env.CLOUDINARY_API_BASE_URL && { upload_prefix: env.CLOUDINARY_API_BASE_URL }),
    });
    configured = true;
  }
  return cloudinary;
}

function wrap(operation, error) {
  if (error instanceof AppError) return error; // configuration / validation errors pass through untouched
  const message = error?.error?.message ?? error?.message ?? "unknown error";
  const failure = new ExternalServiceError("cloudinary", `${operation} failed: ${message}`, {
    upstreamStatus: error?.http_code ?? error?.error?.http_code,
  });
  logger.error("Cloudinary operation failed", { error: failure });
  return failure;
}

/**
 * Identify an image by its leading bytes (never trust the file name or the
 * browser-reported MIME type). Returns the format or null.
 */
export function detectImageFormat(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 12) return null;
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return "jpg";
  if (buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "png";
  if (buffer.toString("ascii", 0, 4) === "RIFF" && buffer.toString("ascii", 8, 12) === "WEBP") return "webp";
  if (buffer.toString("ascii", 4, 8) === "ftyp" && /^avi[fs]$/.test(buffer.toString("ascii", 8, 12))) return "avif";
  return null;
}

/** Validate an uploaded image buffer before it leaves the server. Throws ValidationError. */
export function assertValidImage(buffer) {
  const { maxUploadBytes } = servicesConfig.cloudinary;
  if (!buffer?.length) throw new ValidationError("The file is empty.");
  if (buffer.length > maxUploadBytes) {
    throw new ValidationError(`Images must be ${Math.round(maxUploadBytes / 1024 / 1024)} MB or smaller.`);
  }
  const format = detectImageFormat(buffer);
  if (!format) throw new ValidationError("Unsupported file. Upload a JPG, PNG, WebP or AVIF image.");
  return format;
}

/** The subset of the Cloudinary response we persist on ProductImage. */
function toImageRecord(result) {
  return {
    publicId: result.public_id,
    url: result.secure_url,
    width: result.width,
    height: result.height,
    format: result.format,
    bytes: result.bytes,
  };
}

/**
 * Upload one image.
 * @param {Buffer | string} file Buffer, data URI, or remote URL.
 * @param {{ folder?: string, publicId?: string }} options
 */
export async function uploadImage(file, { folder = servicesConfig.cloudinary.folders.products, publicId } = {}) {
  const { maxUploadBytes, allowedFormats } = servicesConfig.cloudinary;

  if (Buffer.isBuffer(file) && file.length > maxUploadBytes) {
    throw new ValidationError(`Images must be ${Math.round(maxUploadBytes / 1024 / 1024)} MB or smaller.`);
  }

  const options = {
    folder,
    public_id: publicId,
    resource_type: "image",
    allowed_formats: allowedFormats,
    overwrite: Boolean(publicId),
    invalidate: Boolean(publicId),
  };

  try {
    const result = Buffer.isBuffer(file)
      ? await new Promise((resolve, reject) => {
          getCloudinary()
            .uploader.upload_stream(options, (error, res) => (error ? reject(error) : resolve(res)))
            .end(file);
        })
      : await getCloudinary().uploader.upload(file, options);

    // Never persist anything Cloudinary did not confirm as a real image.
    if (result?.resource_type !== "image" || !result.public_id || !result.secure_url || !(result.width > 0)) {
      if (result?.public_id) await deleteImage(result.public_id).catch(() => {});
      throw new ExternalServiceError("cloudinary", "Upload response did not describe a valid image");
    }
    return toImageRecord(result);
  } catch (error) {
    throw wrap("Image upload", error);
  }
}

/** Upload several images in parallel (e.g. a product gallery). */
export async function uploadImages(files, options) {
  return Promise.all(files.map((file) => uploadImage(file, options)));
}

/** Delete an image by public id. Returns true if it existed. */
export async function deleteImage(publicId) {
  try {
    const result = await getCloudinary().uploader.destroy(publicId, { resource_type: "image", invalidate: true });
    return result.result === "ok";
  } catch (error) {
    throw wrap("Image deletion", error);
  }
}

/** Best-effort removal of several assets (after a DB delete has committed). Never throws. */
export async function deleteImagesQuietly(publicIds) {
  // "local/…" ids are static files shipped with the app (seeded catalogue), not Cloudinary assets.
  const remote = publicIds.filter((publicId) => publicId && !publicId.startsWith("local/"));
  const results = await Promise.allSettled(remote.map((publicId) => deleteImage(publicId)));
  const failed = results.filter((result) => result.status === "rejected").length;
  if (failed) logger.warn("Some Cloudinary assets could not be deleted", { failed, total: remote.length });
}

/**
 * Replace an image: upload the new one first, then remove the old one,
 * so a failed upload never leaves a product without its image.
 */
export async function replaceImage(oldPublicId, file, options) {
  const uploaded = await uploadImage(file, options);
  if (oldPublicId) {
    await deleteImage(oldPublicId).catch((error) =>
      logger.warn("Old image could not be deleted after replacement", { publicId: oldPublicId, error }),
    );
  }
  return uploaded;
}

/**
 * Signature for direct browser→Cloudinary uploads (keeps large files off our server).
 * Callers MUST be admin-authorised before calling this.
 */
export function createSignedUploadParams({ folder = servicesConfig.cloudinary.folders.products } = {}) {
  const env = getCloudinaryEnv();
  const timestamp = Math.round(Date.now() / 1000);
  const paramsToSign = { folder, timestamp, allowed_formats: servicesConfig.cloudinary.allowedFormats.join(",") };
  const signature = getCloudinary().utils.api_sign_request(paramsToSign, env.CLOUDINARY_API_SECRET);

  return {
    ...paramsToSign,
    signature,
    apiKey: env.CLOUDINARY_API_KEY, // public by design; the secret is never returned
    cloudName: env.CLOUDINARY_CLOUD_NAME,
    uploadUrl: `https://api.cloudinary.com/v1_1/${env.CLOUDINARY_CLOUD_NAME}/image/upload`,
  };
}

/** Verify credentials by pinging the Admin API. */
export async function verifyCloudinary() {
  try {
    const result = await getCloudinary().api.ping();
    return result?.status === "ok";
  } catch (error) {
    throw wrap("Cloudinary ping", error);
  }
}
