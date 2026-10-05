import Link from "@/i18n/Link";
import { cn } from "@/utils/cn";

const BASE =
  "group/button relative inline-flex items-center justify-center gap-3 select-none whitespace-nowrap eyebrow transition-[background-color,color,border-color,scale] duration-300 ease-(--ease-luxe) active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50";

// Light surfaces: primary/secondary/ghost/link. Dark surfaces: gold/light/outline-light.
const VARIANTS = {
  primary: "bg-ink text-paper hover:bg-ink-soft",
  secondary: "border border-ink text-ink hover:bg-ink hover:text-paper",
  ghost: "text-ink hover:bg-bone",
  link: "text-ink underline decoration-line underline-offset-[6px] hover:decoration-ink !tracking-[0.2em]",
  gold: "bg-gold text-ink hover:bg-gold-light",
  light: "bg-paper text-ink hover:bg-white",
  "outline-light": "border border-paper/60 text-paper hover:border-paper hover:bg-paper hover:text-ink",
  "link-light": "text-paper underline decoration-paper/40 underline-offset-[6px] hover:decoration-gold !tracking-[0.2em]",
};

// All interactive sizes are ≥ 44px tall for touch targets.
const SIZES = {
  sm: "h-11 px-5",
  md: "h-12 px-7",
  lg: "h-14 px-10",
  none: "min-h-11",
};

export function buttonClasses({ variant = "primary", size = "md", fullWidth = false, className } = {}) {
  const isLink = variant === "link" || variant === "link-light";
  return cn(BASE, VARIANTS[variant], isLink ? SIZES.none : SIZES[size], fullWidth && "w-full", className);
}

/** Button, or a Next.js Link styled as a button when `href` is provided. Set `arrow` for a trailing arrow. */
export function Button({ href, variant, size, fullWidth, arrow = false, className, children, ...props }) {
  const classes = buttonClasses({ variant, size, fullWidth, className });
  const content = (
    <>
      {children}
      {arrow ? (
        <svg
          viewBox="0 0 24 24"
          aria-hidden="true"
          className="size-4 transition-transform duration-300 ease-(--ease-luxe) group-hover/button:translate-x-1 rtl:-scale-x-100 rtl:group-hover/button:-translate-x-1"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        >
          <path d="M4 12h15M14 7l5 5-5 5" />
        </svg>
      ) : null}
    </>
  );

  if (href) {
    return (
      <Link href={href} className={classes} {...props}>
        {content}
      </Link>
    );
  }

  return (
    <button type="button" className={classes} {...props}>
      {content}
    </button>
  );
}
