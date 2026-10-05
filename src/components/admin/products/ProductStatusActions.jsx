"use client";

import { useRouter } from "next/navigation";
import { useRef, useTransition } from "react";
import { setProductStatusAction } from "@/actions/admin/products";
import { Button } from "@/components/ui/Button";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/Toast";

/** Archive / Restore for the product edit page — deliberate actions, separate from Save. */
export function ProductStatusActions({ product }) {
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();
  const busy = useRef(false);
  const [pending, startTransition] = useTransition();
  const archived = product.status === "ARCHIVED";

  const change = async () => {
    if (busy.current) return;
    const ok = archived
      ? await confirm({
          title: `Restore “${product.name}”?`,
          message: "It will return as a draft — still hidden from the store until you publish it.",
          confirmLabel: "Restore product",
        })
      : await confirm({
          title: `Archive “${product.name}”?`,
          message: "It will be hidden from the store but kept, with its order history, in the admin. You can restore it at any time.",
          confirmLabel: "Archive product",
        });
    if (!ok) return;
    busy.current = true;
    startTransition(async () => {
      try {
        const result = await setProductStatusAction(product.id, archived ? "DRAFT" : "ARCHIVED");
        if (toast.fromResult(result, archived ? "Product restored as draft." : "Product archived.")) router.refresh();
      } catch {
        toast.error("The status could not be changed. Check your connection and try again.");
      } finally {
        busy.current = false;
      }
    });
  };

  return (
    <Button type="button" variant="secondary" size="sm" disabled={pending} onClick={change}>
      {pending ? (archived ? "Restoring…" : "Archiving…") : archived ? "Restore product" : "Archive product"}
    </Button>
  );
}
