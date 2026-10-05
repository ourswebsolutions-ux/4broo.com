"use client";

import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import { cn } from "@/utils/cn";
import { Icon } from "./Icon";

const ToastContext = createContext(null);
const DURATION = { success: 3500, error: 7000, info: 4000 };

/** Toast notifications (bottom of screen, aria-live). Wrap a layout with <ToastProvider>. */
export function ToastProvider({ children, dismissLabel = "Dismiss" }) {
  const [toasts, setToasts] = useState([]);
  const counter = useRef(0);

  const dismiss = useCallback((id) => setToasts((list) => list.filter((toast) => toast.id !== id)), []);

  const push = useCallback(
    (tone, message) => {
      const id = ++counter.current;
      setToasts((list) => [...list.slice(-3), { id, tone, message }]);
      setTimeout(() => dismiss(id), DURATION[tone] ?? 4000);
    },
    [dismiss],
  );

  const api = useMemo(
    () => ({
      success: (message) => push("success", message),
      error: (message) => push("error", message),
      info: (message) => push("info", message),
      /** Show the right toast for a Server Action result envelope; returns result.ok. */
      fromResult: (result, successMessage) => {
        if (result?.ok) {
          if (successMessage) push("success", successMessage);
          return true;
        }
        push("error", result?.message ?? "Something went wrong.");
        return false;
      },
    }),
    [push],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div aria-live="polite" aria-atomic="false" className="pointer-events-none fixed inset-x-4 bottom-4 z-[60] flex flex-col items-center gap-2 sm:inset-x-auto sm:end-6 sm:items-end">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            role={toast.tone === "error" ? "alert" : "status"}
            className={cn(
              "pointer-events-auto flex w-full max-w-sm animate-reveal items-start gap-3 px-4 py-3.5 text-sm shadow-lg",
              toast.tone === "error" ? "bg-danger text-paper" : "bg-ink text-paper",
            )}
          >
            <Icon name={toast.tone === "error" ? "alert" : "check"} className={cn("mt-0.5 size-4.5", toast.tone !== "error" && "text-gold")} />
            <p className="flex-1 leading-snug">{toast.message}</p>
            <button type="button" onClick={() => dismiss(toast.id)} aria-label={dismissLabel} className="-me-1 -mt-0.5 grid size-7 place-items-center opacity-70 hover:opacity-100">
              <Icon name="close" className="size-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used inside <ToastProvider>");
  return context;
}
