// Shared handling for admin multipart image uploads (one file per request).
import "server-only";
import { servicesConfig } from "../config/server.js";
import { AppError, ValidationError } from "./errors.js";
import { assertValidImage } from "./services/cloudinary.js";

// Multipart framing overhead on top of the file itself.
const ENVELOPE_BYTES = 64 * 1024;

/**
 * Read and validate the single `file` field of a multipart request.
 * Rejects oversize requests from Content-Length before buffering the body.
 * @returns {Promise<{ buffer: Buffer, fields: Record<string, string> }>}
 */
export async function readImageUpload(request) {
  const limit = servicesConfig.cloudinary.maxUploadBytes;
  const declared = Number(request.headers.get("content-length") ?? 0);
  if (declared > limit + ENVELOPE_BYTES) {
    throw new AppError(`Images must be ${Math.round(limit / 1024 / 1024)} MB or smaller.`, { status: 413, code: "PAYLOAD_TOO_LARGE" });
  }

  let form;
  try {
    form = await request.formData();
  } catch {
    throw new ValidationError("Expected a multipart form upload.");
  }

  const file = form.get("file");
  if (!file || typeof file === "string") throw new ValidationError("Choose an image to upload.");

  const buffer = Buffer.from(await file.arrayBuffer());
  assertValidImage(buffer);

  const fields = {};
  for (const [key, value] of form.entries()) if (key !== "file" && typeof value === "string") fields[key] = value;
  return { buffer, fields };
}
