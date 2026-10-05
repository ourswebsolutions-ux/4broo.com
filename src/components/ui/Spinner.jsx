import { cn } from "@/utils/cn";

export function Spinner({ className, label }) {
  return (
    <span role="status" className={cn("inline-flex items-center", className)}>
      <span className="size-3.5 animate-spin rounded-full border border-current border-t-transparent" aria-hidden="true" />
      {label ? <span className="sr-only">{label}</span> : null}
    </span>
  );
}
