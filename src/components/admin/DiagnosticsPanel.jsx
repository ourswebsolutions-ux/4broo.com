"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { cn } from "@/utils/cn";

const CHECKS = [
  { service: "database", label: "Database", description: "MySQL connectivity through Prisma." },
  { service: "email", label: "Email (SMTP)", description: "Connects and authenticates — nothing is sent." },
  { service: "cloudinary", label: "Cloudinary", description: "Verifies API credentials with a ping." },
  {
    service: "whatsapp",
    label: "WhatsApp",
    description: "Sends a real test message to the admin number.",
    body: { send: true },
    confirm: "Send a test WhatsApp message to the configured admin number?",
  },
];

async function runCheck({ service, body }) {
  const response = await fetch(`/api/admin/diagnostics/${service}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body ?? {}),
  });
  const payload = await response.json().catch(() => null);
  if (!payload?.ok) return { ok: false, error: payload?.error?.message ?? `Request failed (${response.status})` };
  return payload.data;
}

export function DiagnosticsPanel() {
  const [results, setResults] = useState({});
  const [running, setRunning] = useState({});

  async function handleRun(check) {
    if (check.confirm && !window.confirm(check.confirm)) return;
    setRunning((state) => ({ ...state, [check.service]: true }));
    try {
      const result = await runCheck(check);
      setResults((state) => ({ ...state, [check.service]: result }));
    } catch {
      setResults((state) => ({ ...state, [check.service]: { ok: false, error: "Network error — please retry." } }));
    } finally {
      setRunning((state) => ({ ...state, [check.service]: false }));
    }
  }

  return (
    <section aria-labelledby="diagnostics-heading" className="flex flex-col gap-6">
      <h2 id="diagnostics-heading" className="eyebrow">
        Integration checks
      </h2>

      <ul className="grid gap-px border border-line bg-line sm:grid-cols-2">
        {CHECKS.map((check) => {
          const result = results[check.service];
          const isRunning = running[check.service];

          return (
            <li key={check.service} className="flex flex-col gap-5 bg-paper p-6 sm:p-8">
              <div className="flex items-start justify-between gap-4">
                <div className="flex flex-col gap-1.5">
                  <h3 className="text-base font-medium">{check.label}</h3>
                  <p className="text-sm text-subtle">{check.description}</p>
                </div>
                <StatusDot result={result} />
              </div>

              <div aria-live="polite" className="min-h-5 text-sm">
                {isRunning ? (
                  <span className="inline-flex items-center gap-2 text-subtle">
                    <Spinner /> Running…
                  </span>
                ) : result ? (
                  <span className={result.ok ? "text-success" : "text-danger"}>
                    {result.ok ? result.detail ?? "OK" : result.error}
                    {typeof result.durationMs === "number" ? (
                      <span className="text-mute"> · {result.durationMs} ms</span>
                    ) : null}
                  </span>
                ) : (
                  <span className="text-mute">Not run yet</span>
                )}
              </div>

              <Button variant="secondary" size="sm" onClick={() => handleRun(check)} disabled={isRunning} className="self-start">
                Run check
              </Button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function StatusDot({ result }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "mt-1.5 size-2 shrink-0 rounded-full",
        !result ? "bg-line" : result.ok ? "bg-success" : "bg-danger",
      )}
    />
  );
}
