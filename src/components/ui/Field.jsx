import { cn } from "@/utils/cn";

/**
 * Labelled input with inline validation message. Editorial underline style.
 * `error` accepts a string or an array of strings (as returned by server validation).
 */
export function Field({ label, name, type = "text", error, hint, className, inputClassName, ...inputProps }) {
  const id = inputProps.id ?? `field-${name}`;
  const messages = [].concat(error ?? []).filter(Boolean);
  const describedBy = messages.length ? `${id}-error` : hint ? `${id}-hint` : undefined;

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <label htmlFor={id} className="eyebrow text-subtle">
        {label}
      </label>
      <input
        id={id}
        name={name}
        type={type}
        aria-invalid={messages.length ? true : undefined}
        aria-describedby={describedBy}
        className={cn(
          "h-12 w-full border-0 border-b bg-transparent px-0 text-base text-ink outline-none transition-colors duration-300",
          "placeholder:text-mute focus:border-ink focus-visible:outline-none",
          messages.length ? "border-danger" : "border-line",
          inputClassName,
        )}
        {...inputProps}
      />
      {messages.length ? (
        <p id={`${id}-error`} className="text-sm text-danger">
          {messages.join(" ")}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-sm text-mute">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
