// Credential-free Cloudinary delivery helpers (safe on server and client).
// Images are stored as their `secure_url`; transformations are inserted into the URL.

const UPLOAD_SEGMENT = "/image/upload/";

export const isCloudinaryUrl = (url) =>
  typeof url === "string" && url.startsWith("https://res.cloudinary.com/") && url.includes(UPLOAD_SEGMENT);

/**
 * Build an optimised delivery URL: automatic format (AVIF/WebP), automatic quality, resized.
 * @param {string} url Cloudinary secure_url
 * @param {{ width?: number, height?: number, crop?: "fill" | "limit" | "fit", quality?: string|number, gravity?: string }} options
 */
export function cloudinaryImageUrl(url, { width, height, crop = "limit", quality = "auto", gravity } = {}) {
  if (!isCloudinaryUrl(url)) return url;

  const transforms = [
    "f_auto",
    `q_${quality}`,
    width && `w_${Math.round(width)}`,
    height && `h_${Math.round(height)}`,
    (width || height) && `c_${crop}`,
    gravity && crop === "fill" && `g_${gravity}`,
  ]
    .filter(Boolean)
    .join(",");

  return url.replace(UPLOAD_SEGMENT, `${UPLOAD_SEGMENT}${transforms}/`);
}

export const RESPONSIVE_WIDTHS = [320, 480, 640, 768, 960, 1200, 1600, 2000];

/** srcSet string for <img>, e.g. product galleries. */
export function cloudinarySrcSet(url, options = {}, widths = RESPONSIVE_WIDTHS) {
  if (!isCloudinaryUrl(url)) return undefined;
  return widths.map((w) => `${cloudinaryImageUrl(url, { ...options, width: w })} ${w}w`).join(", ");
}

/** next/image custom loader: <Image loader={cloudinaryLoader} src={secureUrl} … /> */
export function cloudinaryLoader({ src, width, quality }) {
  return cloudinaryImageUrl(src, { width, quality: quality ?? "auto" });
}
