"use client";

import Image from "next/image";
import { useState } from "react";
import { cn } from "@/utils/cn";
import { cloudinaryLoader, isCloudinaryUrl } from "@/utils/cloudinary-image";

/**
 * next/image wrapper:
 *  - Cloudinary URLs are resized/optimised by Cloudinary itself (f_auto, q_auto, w_…),
 *    so large originals never pass through the Next.js image optimiser;
 *  - local images keep the built-in optimiser;
 *  - a failed load swaps to a branded placeholder instead of a broken image.
 */
export function SmartImage({ src, alt, className, fallbackClassName, onError, ...props }) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) return <ImagePlaceholder className={cn(props.fill && "absolute inset-0", fallbackClassName)} />;

  return (
    <Image
      src={src}
      alt={alt}
      loader={isCloudinaryUrl(src) ? cloudinaryLoader : undefined}
      className={className}
      onError={(event) => {
        setFailed(true);
        onError?.(event);
      }}
      {...props}
    />
  );
}

/** Branded "no image" state: crown mark on bone — never an empty broken box. */
export function ImagePlaceholder({ className, label }) {
  return (
    <div role={label ? "img" : undefined} aria-label={label} className={cn("grid place-items-center bg-bone", className)}>
      {/* eslint-disable-next-line @next/next/no-img-element -- tiny static brand mark */}
      <img src="/brand/logo-mark.png" alt="" aria-hidden="true" className="w-1/4 max-w-24 opacity-25 grayscale" />
    </div>
  );
}
