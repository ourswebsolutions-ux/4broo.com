"use client";

// Small, consistent admin form primitives.
import { cn } from "@/utils/cn";

const CONTROL =
  "w-full border bg-paper px-3.5 text-[0.9375rem] text-ink outline-none transition-colors placeholder:text-mute/70 focus:border-ink disabled:bg-bone disabled:text-mute";

function FieldShell({ id, label, hint, error, counter, required, children, className }) {
  const messages = [].concat(error ?? []).filter(Boolean);
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {label ? (
        <div className="flex items-baseline justify-between gap-3">
          <label htmlFor={id} className="text-[0.8125rem] font-medium text-ink">
            {label}
            {required ? <span className="text-danger"> *</span> : null}
          </label>
          {counter ? <span className={cn("text-xs tabular-nums", counter.value > counter.max ? "text-danger" : "text-mute")}>{counter.value}/{counter.max}</span> : null}
        </div>
      ) : null}
      {children}
      {messages.length ? (
        <p id={`${id}-error`} className="text-xs text-danger">
          {messages.join(" ")}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-xs text-mute">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export function TextField({ id, label, hint, error, maxLength, showCount = false, className, inputClassName, value, required, ...props }) {
  const hasError = Boolean([].concat(error ?? []).filter(Boolean).length);
  return (
    <FieldShell
      id={id}
      label={label}
      hint={hint}
      error={error}
      required={required}
      className={className}
      counter={showCount && maxLength ? { value: String(value ?? "").length, max: maxLength } : null}
    >
      <input
        id={id}
        value={value ?? ""}
        maxLength={maxLength}
        required={required}
        aria-invalid={hasError || undefined}
        aria-describedby={hasError ? `${id}-error` : hint ? `${id}-hint` : undefined}
        className={cn(CONTROL, "h-11", hasError ? "border-danger" : "border-line", inputClassName)}
        {...props}
      />
    </FieldShell>
  );
}

export function TextArea({ id, label, hint, error, maxLength, showCount = false, rows = 4, className, value, ...props }) {
  const hasError = Boolean([].concat(error ?? []).filter(Boolean).length);
  return (
    <FieldShell id={id} label={label} hint={hint} error={error} className={className} counter={showCount && maxLength ? { value: String(value ?? "").length, max: maxLength } : null}>
      <textarea
        id={id}
        rows={rows}
        value={value ?? ""}
        maxLength={maxLength}
        aria-invalid={hasError || undefined}
        className={cn(CONTROL, "py-2.5 leading-relaxed", hasError ? "border-danger" : "border-line")}
        {...props}
      />
    </FieldShell>
  );
}

export function SelectField({ id, label, hint, error, children, className, required, ...props }) {
  const hasError = Boolean([].concat(error ?? []).filter(Boolean).length);
  return (
    <FieldShell id={id} label={label} hint={hint} error={error} required={required} className={className}>
      <select id={id} aria-invalid={hasError || undefined} className={cn(CONTROL, "h-11 pe-8", hasError ? "border-danger" : "border-line")} {...props}>
        {children}
      </select>
    </FieldShell>
  );
}

/** Accessible switch (button role="switch"). */
export function Toggle({ id, label, description, checked, onChange, disabled }) {
  return (
    <div className="flex items-start justify-between gap-4 py-3">
      <div className="flex flex-col gap-0.5">
        <span id={`${id}-label`} className="text-sm font-medium">
          {label}
        </span>
        {description ? <span className="text-xs text-mute">{description}</span> : null}
      </div>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        aria-labelledby={`${id}-label`}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative mt-0.5 h-6 w-11 shrink-0 rounded-full transition-colors duration-300 disabled:opacity-50",
          checked ? "bg-ink" : "bg-sand",
        )}
      >
        <span className={cn("absolute top-0.5 size-5 rounded-full bg-paper shadow transition-[inset-inline-start] duration-300", checked ? "start-[1.375rem]" : "start-0.5")} />
      </button>
    </div>
  );
}

export function Section({ id, title, description, actions, children, className }) {
  return (
    <section aria-labelledby={id} className={cn("min-w-0 border border-line bg-paper", className)}>
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-line px-5 py-4 sm:px-7">
        <div className="flex flex-col gap-1">
          <h2 id={id} className="eyebrow text-ink">
            {title}
          </h2>
          {description ? <p className="text-xs text-mute">{description}</p> : null}
        </div>
        {actions}
      </header>
      <div className="px-5 py-6 sm:px-7">{children}</div>
    </section>
  );
}

const STATUS_STYLES = {
  PUBLISHED: "bg-success/10 text-success",
  ACTIVE: "bg-success/10 text-success",
  DRAFT: "bg-sand text-subtle",
  HIDDEN: "bg-sand text-subtle",
  ARCHIVED: "bg-ink/10 text-mute",
  // orders
  NEW: "bg-gold/15 text-gold-deep",
  CONFIRMED: "bg-ink/10 text-ink",
  PROCESSING: "bg-ink/10 text-ink",
  PACKED: "bg-ink/10 text-ink",
  SHIPPED: "bg-ink text-paper",
  DELIVERED: "bg-success/10 text-success",
  CANCELLED: "bg-danger/10 text-danger",
  // payments
  PENDING: "bg-gold/15 text-gold-deep",
  PAID: "bg-success/10 text-success",
  FAILED: "bg-danger/10 text-danger",
  REFUNDED: "bg-sand text-subtle",
  // notifications
  SENT: "bg-success/10 text-success",
  SKIPPED: "bg-sand text-subtle",
};

export function StatusBadge({ status }) {
  return <span className={cn("eyebrow inline-flex px-2 py-1 !text-[0.625rem] !tracking-[0.16em]", STATUS_STYLES[status] ?? "bg-sand")}>{status.toLowerCase()}</span>;
}
