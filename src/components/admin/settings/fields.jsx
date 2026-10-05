"use client";

// Building blocks for the admin settings page. Credential fields never receive a
// stored value — only whether one is configured and where it comes from.
import { useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/utils/cn";

export const dateTime = (iso) => (iso ? new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(iso)) : "—");

export const fieldId = (key) => key.replace(".", "-");

/** Where a value currently comes from. */
export function sourceText(field) {
  if (field.problem && field.stored) return `Saved value unreadable (${field.problem}) — using ${field.envAvailable ? `environment (${field.envName})` : "fallback"}`;
  switch (field.source) {
    case "database":
      return field.envAvailable ? `Saved in admin — overrides ${field.envName}` : "Saved in admin";
    case "environment":
      return `From environment (${field.envName})`;
    case "default":
      return "Built-in default";
    default:
      return field.problem ? field.problem : "Not configured";
  }
}

export function SourceTag({ field }) {
  const tone =
    field.problem && field.stored ? "bg-danger/10 text-danger" : field.source === "database" ? "bg-ink text-paper" : field.source === "environment" ? "bg-gold/15 text-gold-deep" : field.source === "default" ? "bg-sand text-subtle" : "bg-bone text-mute";
  const label = field.problem && field.stored ? "Unreadable" : { database: "Admin", environment: "Env", default: "Default", unset: "Not set" }[field.source];
  return <span className={cn("eyebrow inline-flex shrink-0 px-1.5 py-0.5 !text-[0.5625rem] !tracking-[0.16em]", tone)}>{label}</span>;
}

export function StatusPill({ tone = "neutral", children }) {
  const styles = { ok: "bg-success/10 text-success", warn: "bg-gold/15 text-gold-deep", error: "bg-danger/10 text-danger", neutral: "bg-sand text-subtle" };
  const dots = { ok: "bg-success", warn: "bg-gold-deep", error: "bg-danger", neutral: "bg-mute" };
  return (
    <span className={cn("eyebrow inline-flex items-center gap-2 px-2.5 py-1.5 !text-[0.625rem] !tracking-[0.16em]", styles[tone])}>
      <span aria-hidden="true" className={cn("size-1.5 rounded-full", dots[tone])} />
      {children}
    </span>
  );
}

/**
 * Credential input. Empty = keep the existing credential. "Replace" reveals a masked
 * input (with show/hide); "Remove" deletes only an admin-saved credential.
 */
export function SecretField({ field, value, onChange, error, onRemove, removing, disabled, hint }) {
  const id = fieldId(field.key);
  const [replacing, setReplacing] = useState(!field.configured);
  const [visible, setVisible] = useState(false);
  const messages = [].concat(error ?? []).filter(Boolean);

  const cancel = () => {
    onChange("");
    setVisible(false);
    setReplacing(false);
  };

  return (
    <div className="flex flex-col gap-1.5 sm:col-span-2">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <label htmlFor={replacing ? id : undefined} className="flex items-center gap-2 text-[0.8125rem] font-medium text-ink">
          {field.label} <SourceTag field={field} />
        </label>
        <span className="flex items-center gap-1.5 text-xs text-mute">
          <Icon name="lock" className="size-3.5" /> Encrypted · never shown
        </span>
      </div>

      <div className="flex flex-col gap-3 border border-line bg-bone/40 p-3.5 sm:flex-row sm:items-center">
        {replacing ? (
          <div className="relative flex-1">
            <input
              id={id}
              type={visible ? "text" : "password"}
              value={value}
              onChange={(event) => onChange(event.target.value)}
              autoComplete="new-password"
              spellCheck={false}
              disabled={disabled}
              placeholder={field.configured ? "Enter the new value — leave empty to keep the current one" : `Enter the ${field.label.toLowerCase()}`}
              aria-invalid={messages.length ? true : undefined}
              aria-describedby={`${id}-help`}
              className={cn(
                "h-11 w-full border bg-paper pe-12 ps-3.5 font-mono text-sm text-ink outline-none transition-colors placeholder:font-sans placeholder:text-mute/70 focus:border-ink",
                messages.length ? "border-danger" : "border-line",
              )}
            />
            <button
              type="button"
              onClick={() => setVisible((v) => !v)}
              className="absolute inset-y-0 end-0 grid w-11 place-items-center text-mute hover:text-ink"
              aria-label={visible ? `Hide ${field.label}` : `Show ${field.label}`}
              aria-pressed={visible}
            >
              <Icon name="eye" className="size-4.5" />
            </button>
          </div>
        ) : (
          <p className="flex flex-1 items-center gap-3 text-sm">
            <span aria-hidden="true" className="font-mono tracking-[0.3em] text-mute">••••••••••••</span>
            <span className="text-subtle">Configured</span>
          </p>
        )}
        <div className="flex shrink-0 gap-2">
          {field.configured && !replacing ? (
            <button type="button" onClick={() => setReplacing(true)} disabled={disabled} className="eyebrow h-11 border border-ink px-4 !text-[0.625rem] hover:bg-ink hover:text-paper disabled:opacity-50">
              Replace
            </button>
          ) : null}
          {field.configured && replacing ? (
            <button type="button" onClick={cancel} disabled={disabled} className="eyebrow h-11 px-4 !text-[0.625rem] text-subtle hover:bg-bone">
              Keep current
            </button>
          ) : null}
          {field.stored ? (
            <button type="button" onClick={onRemove} disabled={disabled || removing} className="eyebrow h-11 px-4 !text-[0.625rem] text-danger hover:bg-danger/10 disabled:opacity-50">
              {removing ? "Removing…" : "Remove"}
            </button>
          ) : null}
        </div>
      </div>

      {messages.length ? (
        <p id={`${id}-help`} className="text-xs text-danger">
          {messages.join(" ")}
        </p>
      ) : (
        <p id={`${id}-help`} className="text-xs text-mute">
          {hint ? `${hint} ` : ""}
          {sourceText(field)}.{field.needsReencrypt ? " Encrypted with a previous key — replace it to re-encrypt with the current key." : ""}
        </p>
      )}
    </div>
  );
}

/** Result of the latest test (this session or the last recorded one). */
export function TestResult({ result, lastSuccessAt }) {
  if (!result && !lastSuccessAt) return <p className="text-xs text-mute">No test has been run yet.</p>;
  return (
    <div className="flex flex-col gap-2" aria-live="polite">
      {result ? (
        <div className={cn("flex items-start gap-3 border px-4 py-3 text-sm", result.ok ? "border-success/30 bg-success/5" : "border-danger/30 bg-danger/5")}>
          <Icon name={result.ok ? "check" : "alert"} className={cn("mt-0.5 size-4 shrink-0", result.ok ? "text-success" : "text-danger")} />
          <span className="flex min-w-0 flex-col gap-0.5">
            <span className="[overflow-wrap:anywhere]">{result.message}</span>
            <span className="text-xs text-mute">{result.ok ? "Passed" : "Failed"} · {dateTime(result.at ?? result.testedAt)}</span>
          </span>
        </div>
      ) : null}
      <p className="text-xs text-mute">Last successful test: {lastSuccessAt ? dateTime(lastSuccessAt) : "never"}</p>
    </div>
  );
}
