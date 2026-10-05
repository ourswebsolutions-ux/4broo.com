"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/utils/cn";
import { Icon } from "./Icon";

const SIDES = {
  // Logical sides follow the reading direction (they swap in RTL / Urdu).
  start:
    "m-0 me-auto h-dvh max-h-dvh w-full max-w-md -translate-x-full rtl:translate-x-full open:translate-x-0 rtl:open:translate-x-0 starting:open:-translate-x-full rtl:starting:open:translate-x-full",
  end: "m-0 ms-auto h-dvh max-h-dvh w-full max-w-md translate-x-full rtl:-translate-x-full open:translate-x-0 rtl:open:translate-x-0 starting:open:translate-x-full rtl:starting:open:-translate-x-full",
  left: "m-0 mr-auto h-dvh max-h-dvh w-full max-w-md -translate-x-full open:translate-x-0 starting:open:-translate-x-full",
  right: "m-0 ml-auto h-dvh max-h-dvh w-full max-w-md translate-x-full open:translate-x-0 starting:open:translate-x-full",
  top: "m-0 mb-auto max-h-dvh w-full max-w-none -translate-y-6 opacity-0 open:translate-y-0 open:opacity-100 starting:open:-translate-y-6 starting:open:opacity-0",
  // Centred dialog (prompts, confirmations).
  modal:
    "m-auto h-fit max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-lg overflow-y-auto translate-y-3 opacity-0 open:translate-y-0 open:opacity-100 starting:open:translate-y-3 starting:open:opacity-0",
};

/**
 * Accessible slide-in panel built on the native <dialog> element:
 * focus is trapped and restored, Esc closes, the page behind is inert.
 * Also used for full-width overlays (side="top") and centred dialogs (side="modal").
 *
 * @param {{ open: boolean, onClose: () => void, label: string, side?: "start"|"end"|"left"|"right"|"top"|"modal", tone?: "light"|"dark", className?: string, children: React.ReactNode, hideCloseButton?: boolean, closeLabel?: string }} props
 */
export function Drawer({ open, onClose, label, side = "end", tone = "light", className, children, hideCloseButton = false, closeLabel = "Close" }) {
  const dialogRef = useRef(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  // Lock page scroll while open (dialog does not do this on its own).
  useEffect(() => {
    if (!open) return;
    const { overflow } = document.documentElement.style;
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.documentElement.style.overflow = overflow;
    };
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      aria-label={label}
      onClose={onClose}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        // Click on the backdrop (the dialog element itself, outside the panel content) closes.
        if (event.target === dialogRef.current) onClose();
      }}
      className={cn(
        "fixed inset-0 p-0 outline-none",
        "transition-[translate,opacity,overlay,display] duration-500 ease-(--ease-luxe) transition-discrete",
        tone === "dark" ? "bg-ink text-paper" : "bg-paper text-ink",
        SIDES[side],
        className,
      )}
    >
      <div className="relative flex h-full flex-col">
        {!hideCloseButton ? (
          <button
            type="button"
            onClick={onClose}
            aria-label={closeLabel}
            className="absolute end-3 top-3 z-10 grid size-11 place-items-center transition-opacity hover:opacity-70 sm:end-5 sm:top-4"
          >
            <Icon name="close" className="size-6" />
          </button>
        ) : null}
        {children}
      </div>
    </dialog>
  );
}
