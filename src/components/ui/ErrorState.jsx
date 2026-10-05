import { cn } from "@/utils/cn";
import { Icon } from "./Icon";

/**
 * Recoverable error message. Pass `action` (e.g. a retry button) from the caller;
 * this component stays server-compatible.
 */
export function ErrorState({ title = "Something went wrong", description = "Please try again in a moment.", reference, referenceLabel = "Reference: {id}", action, className }) {
  return (
    <div role="alert" className={cn("flex flex-col items-center gap-4 px-6 py-16 text-center", className)}>
      <Icon name="alert" className="size-7 text-gold-deep" />
      <h2 className="headline text-title">{title}</h2>
      <p className="max-w-sm text-sm leading-relaxed text-subtle">
        {description}
        {reference ? <span className="mt-2 block text-mute">{referenceLabel.replace("{id}", reference)}</span> : null}
      </p>
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}
