import Image from "next/image";
import Link from "@/i18n/Link";
import { siteConfig } from "@/config/site";
import { cn } from "@/utils/cn";

// Brand assets generated from public/logo.png:
//   mark  → crown + 4B monogram (header, compact spaces)
//   full  → complete lockup incl. "FOUR BRO · CREATE YOUR LEGACY" (footer, brand moments)
const ASSETS = {
  mark: { src: "/brand/logo-mark.png", width: 255, height: 258 },
  full: { src: "/brand/logo-full.png", width: 448, height: 366 },
};

/**
 * @param {{ variant?: "mark" | "full", href?: string | null, className?: string, imageClassName?: string, preload?: boolean }} props
 */
export function Logo({ variant = "mark", href = "/", className, imageClassName, preload = false }) {
  const asset = ASSETS[variant];
  const image = (
    <Image
      src={asset.src}
      width={asset.width}
      height={asset.height}
      alt={`${siteConfig.name} — ${siteConfig.tagline}`}
      preload={preload}
      className={cn("h-full w-auto", imageClassName)}
    />
  );

  if (!href) return <span className={cn("inline-flex", className)}>{image}</span>;

  return (
    <Link href={href} aria-label={`${siteConfig.name} home`} className={cn("inline-flex", className)}>
      {image}
    </Link>
  );
}
