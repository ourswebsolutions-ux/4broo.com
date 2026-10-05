"use client";

import { useState } from "react";
import { ImagePlaceholder, SmartImage } from "@/components/media/SmartImage";
import { Icon } from "@/components/ui/Icon";
import { useDirection, useT } from "@/i18n/I18nProvider";
import { cn } from "@/utils/cn";
import { ImageLightbox } from "./ImageLightbox";
import { trackTransform, useSlider } from "./useSlider";

const MAIN_SIZES = "(min-width: 1024px) 50vw, 100vw";

export function SliderArrow({ direction, onClick, label, className }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={cn(
        "absolute top-1/2 z-10 grid size-11 -translate-y-1/2 place-items-center bg-paper/85 text-ink shadow-sm backdrop-blur-sm transition-[background-color,opacity] duration-300 hover:bg-paper",
        direction === "prev" ? "start-3" : "end-3",
        className,
      )}
    >
      {/* Arrows point in reading direction; mirrored automatically in RTL. */}
      <Icon name="chevronRight" className={cn("size-5 rtl:-scale-x-100", direction === "prev" && "-scale-x-100 rtl:scale-x-100")} />
    </button>
  );
}

/**
 * Product image gallery.
 *  0 images → branded placeholder · 1 image → no navigation · 2+ → slider with
 *  arrows, indicators, desktop thumbnails, touch swipe, keyboard and a lightbox.
 * Images arrive in admin-defined order (primary first, then sortOrder).
 *
 * @param {{ images: Array<{ src: string, alt: string, width: number, height: number }>, productName: string }} props
 */
export function ProductGallery({ images, productName }) {
  const t = useT();
  const dir = useDirection();
  const count = images.length;
  const slider = useSlider(count, { dir });
  const [lightboxOpen, setLightboxOpen] = useState(false);

  if (count === 0) {
    return <ImagePlaceholder label={t("gallery.noImage")} className="aspect-[4/5] w-full" />;
  }

  const multiple = count > 1;

  return (
    <div className={cn("flex flex-col gap-4", multiple && "lg:flex-row-reverse lg:items-start")}>
      {/* Main stage */}
      <div className="relative min-w-0 flex-1">
        <div
          role="region"
          aria-roledescription="carousel"
          aria-label={productName}
          tabIndex={multiple ? 0 : -1}
          onKeyDown={(event) => {
            if (slider.onKeyDown(event)) return;
            if (event.key === "Enter") setLightboxOpen(true);
          }}
          className="group/stage relative aspect-[4/5] touch-pan-y select-none overflow-hidden bg-bone outline-offset-4"
          {...slider.swipeHandlers}
        >
          <ul
            className={cn("flex h-full will-change-transform", !slider.dragging && "transition-transform duration-500 ease-(--ease-luxe)")}
            style={{ transform: trackTransform(slider.index, slider.dragOffset, dir) }}
          >
            {images.map((image, i) => (
              <li
                key={image.src}
                className="relative h-full w-full shrink-0"
                aria-hidden={i !== slider.index}
                aria-roledescription="slide"
                aria-label={t("gallery.imageOf", { current: i + 1, total: count })}
              >
                <SmartImage
                  src={image.src}
                  alt={image.alt}
                  fill
                  sizes={MAIN_SIZES}
                  preload={i === 0}
                  // The visible image and its neighbours load eagerly; the rest lazily.
                  loading={Math.abs(i - slider.index) <= 1 || i === 0 ? "eager" : "lazy"}
                  draggable={false}
                  className="object-cover"
                />
              </li>
            ))}
          </ul>

          <button
            type="button"
            onClick={() => !slider.consumeSwipeClick() && setLightboxOpen(true)}
            aria-label={t("gallery.open")}
            className="absolute inset-0 z-0 cursor-zoom-in"
            tabIndex={-1}
          />

          {multiple ? (
            <>
              <SliderArrow direction="prev" onClick={slider.prev} label={t("gallery.previous")} className="lg:opacity-0 lg:group-hover/stage:opacity-100 lg:focus-visible:opacity-100" />
              <SliderArrow direction="next" onClick={slider.next} label={t("gallery.next")} className="lg:opacity-0 lg:group-hover/stage:opacity-100 lg:focus-visible:opacity-100" />
              <p dir="ltr" className="eyebrow pointer-events-none absolute bottom-3 end-3 z-10 bg-paper/85 px-2.5 py-1.5 tabular-nums text-ink backdrop-blur-sm lg:hidden">
                {slider.index + 1} / {count}
              </p>
            </>
          ) : null}

          <button
            type="button"
            onClick={() => setLightboxOpen(true)}
            aria-label={t("gallery.open")}
            className="absolute bottom-3 start-3 z-10 grid size-11 place-items-center bg-paper/85 text-ink backdrop-blur-sm transition-colors hover:bg-paper"
          >
            <Icon name="search" className="size-4.5" />
          </button>
        </div>

        <p className="sr-only" aria-live="polite">
          {t("gallery.imageOf", { current: slider.index + 1, total: count })}
        </p>

        {/* Indicators (mobile / tablet) */}
        {multiple ? (
          <div className="mt-4 flex justify-center gap-1 lg:hidden">
            {images.map((image, i) => (
              <button
                key={image.src}
                type="button"
                onClick={() => slider.goTo(i)}
                aria-label={t("gallery.goTo", { index: i + 1 })}
                aria-current={i === slider.index ? "true" : undefined}
                className="grid size-6 place-items-center"
              >
                <span className={cn("block size-1.5 rounded-full transition-all duration-300", i === slider.index ? "w-5 bg-ink" : "bg-ink/25")} />
              </button>
            ))}
          </div>
        ) : null}
      </div>

      {/* Thumbnails (desktop) */}
      {multiple ? (
        <ul className="scrollbar-none hidden max-h-[calc((min(50vw,46rem))*1.25)] w-20 shrink-0 flex-col gap-2 overflow-y-auto lg:flex xl:w-24">
          {images.map((image, i) => (
            <li key={image.src}>
              <button
                type="button"
                onClick={() => slider.goTo(i)}
                aria-label={t("gallery.goTo", { index: i + 1 })}
                aria-current={i === slider.index ? "true" : undefined}
                className={cn(
                  "relative block aspect-[4/5] w-full overflow-hidden bg-bone outline-offset-2 transition-opacity duration-300",
                  i === slider.index ? "opacity-100 ring-1 ring-ink ring-offset-2 ring-offset-paper" : "opacity-55 hover:opacity-90",
                )}
              >
                <SmartImage src={image.src} alt="" fill sizes="96px" className="object-cover" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      <ImageLightbox
        images={images}
        open={lightboxOpen}
        startIndex={slider.index}
        onClose={(lastIndex) => {
          setLightboxOpen(false);
          if (typeof lastIndex === "number") slider.goTo(lastIndex);
        }}
      />
    </div>
  );
}
