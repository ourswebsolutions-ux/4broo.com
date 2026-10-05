"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { Button } from "./Button";

const ConfirmContext = createContext(null);

/**
 * Promise-based confirmation dialog (native <dialog>: focus trap, Esc = cancel).
 *   const confirm = useConfirm();
 *   if (await confirm({ title: "Delete image?", confirmLabel: "Delete", tone: "danger" })) …
 */
export function ConfirmProvider({ children }) {
  const [request, setRequest] = useState(null);
  const dialogRef = useRef(null);
  const resolver = useRef(null);

  const confirm = useCallback(
    (options) =>
      new Promise((resolve) => {
        resolver.current = resolve;
        setRequest(options);
      }),
    [],
  );

  const settle = useCallback((value) => {
    resolver.current?.(value);
    resolver.current = null;
    setRequest(null);
  }, []);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (request && dialog && !dialog.open) dialog.showModal();
    if (!request && dialog?.open) dialog.close();
  }, [request]);

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <dialog
        ref={dialogRef}
        aria-labelledby="confirm-title"
        aria-describedby="confirm-message"
        onCancel={(event) => {
          event.preventDefault();
          settle(false);
        }}
        className="m-auto w-[calc(100%-2rem)] max-w-md bg-paper p-0 text-ink shadow-2xl"
      >
        {request ? (
          <div className="flex flex-col gap-5 p-7">
            <h2 id="confirm-title" className="font-display text-2xl font-light">
              {request.title}
            </h2>
            {request.message ? (
              <p id="confirm-message" className="text-sm leading-relaxed text-subtle">
                {request.message}
              </p>
            ) : null}
            <div className="mt-2 flex flex-wrap justify-end gap-3">
              <Button variant="secondary" size="sm" onClick={() => settle(false)} autoFocus>
                {request.cancelLabel ?? "Cancel"}
              </Button>
              <Button
                size="sm"
                onClick={() => settle(true)}
                className={request.tone === "danger" ? "!bg-danger hover:!bg-danger/90" : undefined}
              >
                {request.confirmLabel ?? "Confirm"}
              </Button>
            </div>
          </div>
        ) : null}
      </dialog>
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const context = useContext(ConfirmContext);
  if (!context) throw new Error("useConfirm must be used inside <ConfirmProvider>");
  return context;
}
