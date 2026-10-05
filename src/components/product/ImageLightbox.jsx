"use client";

import { useEffect, useRef } from "react";
import { SmartImage } from "@/components/media/SmartImage";
import { Icon } from "@/components/ui/Icon";
import { useDirection, useT } from "@/i18n/I18nProvider";
import { cn } from "@/utils/cn";
import { trackTransform, useSlider } from "./useSlider";

/**
 * Full-screen image viewer on the native <dialog> (focus trap, Esc to close).
 * Arrows / keyboard / swipe navigation; returns the last viewed index on close
 * so the inline gallery stays in sync.
 */
export function ImageLightbox({ images, open, startIndex = 0, onClose }) {
  const t = useT();
  const dir = useDirection();
  const dialogRef = useRef(null);
  const slider = useSlider(images.length, { dir });
  const { goTo, index } = slider;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      goTo(startIndex);
      dialog.showModal();
      const { overflow } = document.documentElement.style;
      document.documentElement.style.overflow = "hidden";
      return () => {
        document.documentElement.style.overflow = overflow;
      };
    }
    if (!open && dialog.open) dialog.close();
  }, [open, startIndex, goTo]);

  const close = () => onClose?.(index);
  const multiple = images.length > 1;

  return (
    <dialog
      ref={dialogRef}
      aria-label={t("gallery.viewer")}
      onCancel={(event) => {
        event.preventDefault();
        close();
      }}
      onKeyDown={slider.onKeyDown}
      className="fixed inset-0 m-0 h-dvh max-h-none w-screen max-w-none bg-ink p-0 text-paper opacity-0 transition-[opacity,overlay,display] duration-300 transition-discrete open:opacity-100 starting:open:opacity-0"
    >
      {open ? (
        <div className="relative flex h-full flex-col">
          <div className="flex h-16 shrink-0 items-center justify-between px-4 sm:px-6">
            <p className="eyebrow tabular-nums text-mist" aria-live="polite">
              {t("gallery.imageOf", { current: index + 1, total: images.length })}
            </p>
            <button
              type="button"
              onClick={close}
              aria-label={t("gallery.close")}
              className="grid size-11 place-items-center text-paper transition-colors hover:text-gold"
              autoFocus
            >
              <Icon name="close" className="size-6" />
            </button>
          </div>

          <div className="relative min-h-0 flex-1 touch-pan-y select-none overflow-hidden" {...slider.swipeHandlers}>
            <ul
              className={cn("flex h-full", !slider.dragging && "transition-transform duration-500 ease-(--ease-luxe)")}
              style={{ transform: trackTransform(index, slider.dragOffset, dir) }}
            >
              {images.map((image, i) => (
                <li key={image.src} className="relative h-full w-full shrink-0" aria-hidden={i !== index}>
                  {Math.abs(i - index) <= 1 ? (
                    <SmartImage src={image.src} alt={image.alt} fill sizes="100vw" draggable={false} className="object-contain" />
                  ) : null}
                </li>
              ))}
            </ul>

            {multiple ? (
              <>
                <LightboxArrow direction="prev" onClick={slider.prev} label={t("gallery.previous")} />
                <LightboxArrow direction="next" onClick={slider.next} label={t("gallery.next")} />
              </>
            ) : null}
          </div>

          {multiple ? (
            <div className="flex h-16 shrink-0 items-center justify-center gap-1">
              {images.map((image, i) => (
                <button
                  key={image.src}
                  type="button"
                  onClick={() => goTo(i)}
                  aria-label={t("gallery.goTo", { index: i + 1 })}
                  aria-current={i === index ? "true" : undefined}
                  className="grid size-6 place-items-center"
                >
                  <span className={cn("block size-1.5 rounded-full transition-all duration-300", i === index ? "w-5 bg-gold" : "bg-paper/30")} />
                </button>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </dialog>
  );
}

function LightboxArrow({ direction, onClick, label }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={cn(
        "absolute top-1/2 grid size-12 -translate-y-1/2 place-items-center text-paper/80 transition-colors hover:text-gold",
        direction === "prev" ? "start-2 sm:start-6" : "end-2 sm:end-6",
      )}
    >
      <Icon name="chevronRight" className={cn("size-7 rtl:-scale-x-100", direction === "prev" && "-scale-x-100 rtl:scale-x-100")} />
    </button>
  );
}
