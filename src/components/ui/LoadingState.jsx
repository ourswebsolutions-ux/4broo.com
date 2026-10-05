import { cn } from "@/utils/cn";
import { Spinner } from "./Spinner";

/** Inline/section loading indicator with an accessible label. */
export function LoadingState({ label = "Loading", className }) {
  return (
    <div className={cn("flex items-center justify-center gap-3 py-16 text-subtle", className)}>
      <Spinner label={label} />
      <span className="eyebrow">{label}</span>
    </div>
  );
}

/** Neutral shimmer block for skeleton layouts. */
export function Skeleton({ className, dark = false }) {
  return <div aria-hidden="true" className={cn("animate-pulse", dark ? "bg-graphite" : "bg-sand/70", className)} />;
}
