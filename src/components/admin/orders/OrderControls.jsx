"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { markCodPaidAction, retryNotificationAction, saveAdminNoteAction, updateOrderStatusAction } from "@/actions/admin/orders";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { Spinner } from "@/components/ui/Spinner";
import { useToast } from "@/components/ui/Toast";
import { cn } from "@/utils/cn";

const LABEL = { CONFIRMED: "Confirm order", PROCESSING: "Start processing", PACKED: "Mark packed", SHIPPED: "Mark shipped", DELIVERED: "Mark delivered", CANCELLED: "Cancel order" };

/** Status workflow buttons — only valid next steps are offered; the server re-checks. */
export function OrderStatusControls({ order, nextStatuses }) {
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();
  const [note, setNote] = useState("");
  const [pending, startTransition] = useTransition();

  const move = async (to) => {
    if (to === "CANCELLED") {
      const paidOnline = order.payment?.method !== "COD" && order.payment?.status === "PAID";
      const ok = await confirm({
        title: `Cancel ${order.orderNumber}?`,
        message: `Reserved stock will be returned to inventory.${paidOnline ? " This order was paid online — issue the refund with the payment provider separately." : ""}`,
        confirmLabel: "Cancel order",
        tone: "danger",
      });
      if (!ok) return;
    }
    startTransition(async () => {
      const result = await updateOrderStatusAction({ id: order.id, from: order.status, to, note: note || undefined });
      if (toast.fromResult(result, `Order moved to ${to.toLowerCase()}.`)) {
        setNote("");
        router.refresh();
      }
    });
  };

  if (!nextStatuses.length) return <p className="text-sm text-mute">This order is {order.status.toLowerCase()} — no further status changes.</p>;

  return (
    <div className="flex flex-col gap-4">
      <label className="flex flex-col gap-2">
        <span className="eyebrow text-subtle">Note for the history (optional)</span>
        <input value={note} onChange={(event) => setNote(event.target.value)} maxLength={500} className="h-11 border border-line bg-paper px-3 text-sm outline-none focus:border-ink" placeholder="e.g. Courier tracking number" />
      </label>
      <div className="flex flex-wrap items-center gap-2">
        {nextStatuses.map((status) => (
          <button
            key={status}
            type="button"
            disabled={pending}
            onClick={() => move(status)}
            className={cn(
              "eyebrow h-11 px-5 transition-[background-color,color,scale] active:scale-[0.98] disabled:opacity-50",
              status === "CANCELLED" ? "border border-danger text-danger hover:bg-danger hover:text-paper" : "bg-ink text-paper hover:bg-ink-soft",
            )}
          >
            {LABEL[status]}
          </button>
        ))}
        {pending ? <Spinner label="Saving" className="ms-2 text-mute" /> : null}
      </div>
    </div>
  );
}

export function CodPaymentControl({ order }) {
  const router = useRouter();
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => startTransition(async () => toast.fromResult(await markCodPaidAction(order.id), "Cash payment recorded.") && router.refresh())}
      className="eyebrow h-10 border border-ink px-4 hover:bg-ink hover:text-paper disabled:opacity-50"
    >
      {pending ? "Saving…" : "Mark cash received"}
    </button>
  );
}

export function AdminNoteForm({ order }) {
  const router = useRouter();
  const toast = useToast();
  const [value, setValue] = useState(order.adminNote ?? "");
  const [pending, startTransition] = useTransition();
  const dirty = value !== (order.adminNote ?? "");
  return (
    <div className="flex flex-col gap-3">
      <textarea value={value} onChange={(event) => setValue(event.target.value)} rows={4} maxLength={5000} className="w-full border border-line bg-paper p-3 text-sm outline-none focus:border-ink" placeholder="Internal note — never shown to the customer" />
      <button
        type="button"
        disabled={pending || !dirty}
        onClick={() => startTransition(async () => toast.fromResult(await saveAdminNoteAction(order.id, value), "Note saved.") && router.refresh())}
        className="eyebrow h-10 self-start bg-ink px-5 text-paper hover:bg-ink-soft disabled:opacity-40"
      >
        {pending ? "Saving…" : "Save note"}
      </button>
    </div>
  );
}

/** Retry a failed notification event (admin only; the server refuses to resend a delivered one). */
export function RetryNotificationButton({ orderId, eventKey }) {
  const router = useRouter();
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const result = await retryNotificationAction(orderId, eventKey);
          if (toast.fromResult(result, "Retry finished — see the latest status.")) router.refresh();
        })
      }
      className="eyebrow h-9 border border-ink px-3 !text-[0.625rem] hover:bg-ink hover:text-paper disabled:opacity-50"
    >
      {pending ? "Retrying…" : "Retry"}
    </button>
  );
}
