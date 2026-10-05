import { cn } from "@/utils/cn";
import { Icon } from "./Icon";

/** Consistent empty state (empty collections, bag, wishlist, no search results…). */
export function EmptyState({ icon, eyebrow, title, description, action, tone = "light", className }) {
  const dark = tone === "dark";
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-4 border px-6 py-14 text-center sm:py-20",
        dark ? "border-graphite" : "border-line",
        className,
      )}
    >
      {icon ? <Icon name={icon} className={cn("mb-2 size-7", dark ? "text-gold" : "text-gold-deep")} /> : null}
      {eyebrow ? <p className={cn("eyebrow", dark ? "text-mist" : "text-mute")}>{eyebrow}</p> : null}
      <h2 className="headline text-title">{title}</h2>
      {description ? (
        <p className={cn("max-w-sm text-sm leading-relaxed", dark ? "text-mist" : "text-subtle")}>{description}</p>
      ) : null}
      {action ? <div className="mt-3">{action}</div> : null}
    </div>
  );
}
