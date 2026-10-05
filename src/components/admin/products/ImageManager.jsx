"use client";

import { forwardRef, useCallback, useImperativeHandle, useState, useTransition } from "react";
import { deleteImageAction, reorderImagesAction, setPrimaryImageAction, updateImageAltAction } from "@/actions/admin/products";
import { SmartImage } from "@/components/media/SmartImage";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { Icon } from "@/components/ui/Icon";
import { useToast } from "@/components/ui/Toast";
import { cn } from "@/utils/cn";
import { ACCEPTED_TYPES, MAX_IMAGE_BYTES, useImageUploads } from "./useImageUploads";

const ICON_BUTTON = "grid size-9 place-items-center bg-paper/90 text-ink transition-colors hover:bg-paper disabled:opacity-40";

/**
 * Product image manager: multi-file upload with per-file progress/errors,
 * ordering (buttons or drag & drop), primary selection, alt text and deletion.
 * Without a productId (new product) files are queued and uploaded by the parent
 * form after the product is created — via ref.uploadPending(productId).
 */
export const ImageManager = forwardRef(function ImageManager({ productId, productName, initialImages = [] }, ref) {
  const toast = useToast();
  const confirm = useConfirm();
  const [images, setImages] = useState(initialImages);
  const [dragIndex, setDragIndex] = useState(null);
  const [dropActive, setDropActive] = useState(false);
  const [pending, startTransition] = useTransition();

  const onUploaded = useCallback((_item, data) => setImages((list) => [...list, data.image]), []);
  const uploads = useImageUploads({ uploadUrl: (id) => `/api/admin/products/${id}/images`, onUploaded });

  const summarise = ({ succeeded, failed }) => {
    if (succeeded) toast.success(`${succeeded} image${succeeded === 1 ? "" : "s"} uploaded.`);
    if (failed) toast.error(`${failed} image${failed === 1 ? "" : "s"} failed — see the list below.`);
  };

  useImperativeHandle(ref, () => ({
    hasPending: () => uploads.items.some((item) => item.status === "queued"),
    uploadPending: async (id) => summarise(await uploads.start(id)),
  }));

  const addFiles = async (fileList) => {
    if (!fileList?.length) return;
    uploads.add(fileList);
    if (productId) summarise(await uploads.start(productId));
  };

  const persistOrder = (next, previous) => {
    setImages(next);
    startTransition(async () => {
      const result = await reorderImagesAction(productId, next.map((image) => image.id));
      if (!toast.fromResult(result, "Image order saved.")) setImages(previous);
    });
  };

  const move = (from, to) => {
    if (to < 0 || to >= images.length || from === to) return;
    const next = [...images];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    persistOrder(next, images);
  };

  const makePrimary = (imageId) => {
    const previous = images;
    setImages((list) => list.map((image) => ({ ...image, isPrimary: image.id === imageId })));
    startTransition(async () => {
      if (!toast.fromResult(await setPrimaryImageAction(productId, imageId), "Primary image updated.")) setImages(previous);
    });
  };

  const saveAlt = (image, alt) => {
    if (alt === image.alt) return;
    setImages((list) => list.map((item) => (item.id === image.id ? { ...item, alt } : item)));
    startTransition(async () => {
      toast.fromResult(await updateImageAltAction(productId, image.id, alt), "Alt text saved.");
    });
  };

  const remove = async (image) => {
    const ok = await confirm({
      title: "Delete this image?",
      message: "It will be removed from the product and deleted from Cloudinary.",
      confirmLabel: "Delete image",
      tone: "danger",
    });
    if (!ok) return;
    const previous = images;
    const remaining = images.filter((item) => item.id !== image.id);
    if (image.isPrimary && remaining[0]) remaining[0] = { ...remaining[0], isPrimary: true };
    setImages(remaining);
    startTransition(async () => {
      if (!toast.fromResult(await deleteImageAction(productId, image.id), "Image deleted.")) setImages(previous);
    });
  };

  const uploading = uploads.items.some((item) => item.status === "uploading");

  return (
    <div className="flex flex-col gap-6">
      {/* Drop zone */}
      <label
        onDragOver={(event) => {
          event.preventDefault();
          setDropActive(true);
        }}
        onDragLeave={() => setDropActive(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDropActive(false);
          if (event.dataTransfer.files?.length) addFiles(event.dataTransfer.files);
        }}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center gap-2 border border-dashed px-6 py-10 text-center transition-colors",
          dropActive ? "border-ink bg-bone" : "border-line hover:border-mute",
        )}
      >
        <Icon name="upload" className="size-6 text-gold-deep" />
        <span className="text-sm font-medium">Drop images here or click to choose</span>
        <span className="text-xs text-mute">
          JPG, PNG, WebP or AVIF · up to {MAX_IMAGE_BYTES / 1024 / 1024} MB each · select several at once
        </span>
        <input
          type="file"
          multiple
          accept={ACCEPTED_TYPES.join(",")}
          className="sr-only"
          onChange={(event) => {
            addFiles(event.target.files);
            event.target.value = "";
          }}
        />
      </label>

      {!productId && uploads.items.length ? (
        <p className="text-xs text-mute">Images upload automatically when you save the product.</p>
      ) : null}

      {/* Upload queue */}
      {uploads.items.length ? (
        <ul className="flex flex-col gap-2" aria-live="polite">
          {uploads.items.map((item) => (
            <li key={item.key} className={cn("flex items-center gap-3 border px-3 py-2", item.status === "error" ? "border-danger/40 bg-danger/5" : "border-line")}>
              {/* eslint-disable-next-line @next/next/no-img-element -- local object-URL preview */}
              <img src={item.previewUrl} alt="" className="size-12 shrink-0 object-cover" />
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <p className="truncate text-sm">{item.name}</p>
                {item.status === "error" ? (
                  <p className="text-xs text-danger">{item.error}</p>
                ) : item.status === "uploading" ? (
                  <div className="h-1 w-full overflow-hidden bg-sand" role="progressbar" aria-valuenow={item.progress} aria-valuemin={0} aria-valuemax={100} aria-label={`Uploading ${item.name}`}>
                    <div className="h-full bg-ink transition-[width] duration-200" style={{ width: `${item.progress}%` }} />
                  </div>
                ) : (
                  <p className="text-xs text-mute">{productId ? "Waiting…" : "Queued"}</p>
                )}
              </div>
              {item.status === "uploading" ? <span className="text-xs tabular-nums text-mute">{item.progress}%</span> : null}
              {item.status === "error" && productId ? (
                <button type="button" className="text-xs underline" onClick={async () => summarise(await uploads.start(productId, { retryFailed: true }))}>
                  Retry
                </button>
              ) : null}
              {item.status !== "uploading" ? (
                <button type="button" onClick={() => uploads.remove(item.key)} aria-label={`Remove ${item.name}`} className="grid size-8 place-items-center hover:bg-bone">
                  <Icon name="close" className="size-4" />
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}

      {/* Saved gallery */}
      {images.length ? (
        <>
          <p className="text-xs text-mute">
            {images.length} image{images.length === 1 ? "" : "s"} · the primary image is shown first on the storefront, then this order. Drag to reorder or use the arrows.
          </p>
          <ol className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
            {images.map((image, index) => (
              <li
                key={image.id}
                draggable={!pending && !uploading}
                onDragStart={() => setDragIndex(index)}
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => {
                  event.preventDefault();
                  if (dragIndex !== null) move(dragIndex, index);
                  setDragIndex(null);
                }}
                onDragEnd={() => setDragIndex(null)}
                className={cn("flex flex-col gap-2", dragIndex === index && "opacity-50")}
              >
                <div className={cn("group relative aspect-[4/5] overflow-hidden bg-bone", image.isPrimary && "ring-2 ring-gold ring-offset-2 ring-offset-paper")}>
                  <SmartImage src={image.url} alt={image.alt || productName} fill sizes="240px" className="object-cover" />
                  <span className="absolute start-2 top-2 bg-ink/80 px-1.5 py-0.5 text-[0.6875rem] tabular-nums text-paper">{index + 1}</span>
                  {image.isPrimary ? <span className="eyebrow absolute end-2 top-2 bg-gold px-1.5 py-1 !text-[0.5625rem] text-ink">Primary</span> : null}
                  <span className="absolute bottom-2 start-2 hidden cursor-grab text-paper drop-shadow lg:block" aria-hidden="true">
                    <Icon name="grip" className="size-5" />
                  </span>
                  <div className="absolute inset-x-2 bottom-2 flex justify-end gap-1">
                    <button type="button" className={ICON_BUTTON} disabled={pending || index === 0} onClick={() => move(index, index - 1)} aria-label={`Move image ${index + 1} earlier`}>
                      <Icon name="chevronRight" className="size-4 -scale-x-100" />
                    </button>
                    <button type="button" className={ICON_BUTTON} disabled={pending || index === images.length - 1} onClick={() => move(index, index + 1)} aria-label={`Move image ${index + 1} later`}>
                      <Icon name="chevronRight" className="size-4" />
                    </button>
                    {!image.isPrimary ? (
                      <button type="button" className={ICON_BUTTON} disabled={pending} onClick={() => makePrimary(image.id)} aria-label={`Make image ${index + 1} the primary image`}>
                        <Icon name="star" className="size-4" />
                      </button>
                    ) : null}
                    <button type="button" className={cn(ICON_BUTTON, "text-danger")} disabled={pending} onClick={() => remove(image)} aria-label={`Delete image ${index + 1}`}>
                      <Icon name="trash" className="size-4" />
                    </button>
                  </div>
                </div>
                <label className="sr-only" htmlFor={`alt-${image.id}`}>
                  Alt text for image {index + 1}
                </label>
                <input
                  id={`alt-${image.id}`}
                  defaultValue={image.alt}
                  maxLength={191}
                  placeholder="Alt text (describe the image)"
                  onBlur={(event) => saveAlt(image, event.target.value.trim())}
                  className="h-9 border border-line bg-paper px-2.5 text-xs outline-none focus:border-ink"
                />
              </li>
            ))}
          </ol>
        </>
      ) : !uploads.items.length ? (
        <p className="text-sm text-mute">No images yet. Products without images show a branded placeholder on the storefront.</p>
      ) : null}
    </div>
  );
});
