"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useTransition } from "react";
import { deleteProductAction, setProductStatusAction } from "@/actions/admin/products";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { Icon } from "@/components/ui/Icon";
import { Spinner } from "@/components/ui/Spinner";
import { useToast } from "@/components/ui/Toast";

const MENU_ITEM = "flex w-full items-center gap-2.5 px-4 py-2.5 text-start text-sm hover:bg-bone disabled:opacity-50";

/** Row actions for the admin product table. */
export function ProductRowActions({ product }) {
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();
  const menuRef = useRef(null);
  const [pending, startTransition] = useTransition();

  const run = (task, successMessage) => {
    menuRef.current?.removeAttribute("open");
    startTransition(async () => {
      if (toast.fromResult(await task(), successMessage)) router.refresh();
    });
  };

  const setStatus = (status, message) => run(() => setProductStatusAction(product.id, status), message);

  const archive = async () => {
    menuRef.current?.removeAttribute("open");
    const ok = await confirm({
      title: `Archive “${product.name}”?`,
      message: "It will be hidden from the store but kept, with its order history, in the admin. You can restore it at any time.",
      confirmLabel: "Archive product",
    });
    if (ok) setStatus("ARCHIVED", "Product archived.");
  };

  const remove = async () => {
    menuRef.current?.removeAttribute("open");
    const ok = await confirm({
      title: `Delete “${product.name}”?`,
      message: "The product, its variants and all of its images will be permanently removed. This cannot be undone.",
      confirmLabel: "Delete product",
      tone: "danger",
    });
    if (ok) run(() => deleteProductAction(product.id), "Product deleted.");
  };

  return (
    <div className="flex items-center justify-end gap-1">
      {pending ? <Spinner label="Saving" className="me-2 text-mute" /> : null}
      <Link href={`/admin/products/${product.id}`} className="grid size-9 place-items-center hover:bg-bone" aria-label={`Edit ${product.name}`}>
        <Icon name="edit" className="size-4.5" />
      </Link>
      <details ref={menuRef} className="relative">
        <summary className="grid size-9 cursor-pointer list-none place-items-center hover:bg-bone [&::-webkit-details-marker]:hidden" aria-label={`More actions for ${product.name}`}>
          <span aria-hidden="true" className="text-lg leading-none">⋯</span>
        </summary>
        <div className="absolute end-0 top-full z-20 mt-1 w-52 border border-line bg-paper py-1 shadow-lg">
          {product.status === "PUBLISHED" ? (
            <>
              <a href={`/products/${product.slug}`} target="_blank" rel="noopener noreferrer" className={MENU_ITEM}>
                <Icon name="eye" className="size-4" /> View in store
              </a>
              <button type="button" className={MENU_ITEM} disabled={pending} onClick={() => setStatus("DRAFT", "Product unpublished (draft).")}>
                <Icon name="close" className="size-4" /> Unpublish
              </button>
            </>
          ) : (
            <button type="button" className={MENU_ITEM} disabled={pending} onClick={() => setStatus("PUBLISHED", "Product published.")}>
              <Icon name="check" className="size-4" /> Publish
            </button>
          )}
          {product.status === "ARCHIVED" ? (
            <button type="button" className={MENU_ITEM} disabled={pending} onClick={() => setStatus("DRAFT", "Product restored as draft.")}>
              <Icon name="arrowUp" className="size-4" /> Restore
            </button>
          ) : (
            <button type="button" className={MENU_ITEM} disabled={pending} onClick={archive}>
              <Icon name="arrowDown" className="size-4" /> Archive
            </button>
          )}
          <div className="my-1 border-t border-line" />
          {product.hasOrders ? (
            <p className="px-4 py-2.5 text-xs text-mute">In past orders — archive instead of deleting.</p>
          ) : (
            <button type="button" className={`${MENU_ITEM} text-danger`} disabled={pending} onClick={remove}>
              <Icon name="trash" className="size-4" /> Delete
            </button>
          )}
        </div>
      </details>
    </div>
  );
}
