"use server";

// Admin order management. Orders are created ONLY by customer checkout — there
// is deliberately no create/duplicate action here. Admins move orders through
// the status workflow, record COD cash collection and keep internal notes.
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { runAdminAction } from "@/lib/actions";
import { validate } from "@/lib/validation";
import { idSchema } from "@/lib/validation/schemas/common";
import { z } from "zod";
import { notifyStatusChanged, retryNotification } from "@/services/notificationService";
import { ORDER_STATUSES, markCodPaymentReceived, updateAdminNote, updateOrderStatus } from "@/services/orderService";

const statusInput = z.object({
  id: idSchema,
  from: z.enum(ORDER_STATUSES),
  to: z.enum(ORDER_STATUSES),
  note: z.string().trim().max(500).optional(),
});

const refresh = (id) => {
  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${id}`);
};

export async function updateOrderStatusAction(input) {
  return runAdminAction("update order status", async () => {
    const { id, from, to, note } = validate(statusInput, input);
    const order = await updateOrderStatus(id, { from, to, note });
    refresh(id);
    // Customer update (WhatsApp → email fallback) after the response.
    after(() => notifyStatusChanged(id, to));
    return order;
  });
}

export async function markCodPaidAction(orderId) {
  return runAdminAction("mark COD paid", async () => {
    const id = validate(idSchema, orderId);
    await markCodPaymentReceived(id);
    refresh(id);
  });
}

export async function saveAdminNoteAction(orderId, note) {
  return runAdminAction("save admin note", async () => {
    const id = validate(idSchema, orderId);
    await updateAdminNote(id, note);
    refresh(id);
  });
}

const eventKeySchema = z.string().trim().max(191).regex(/^(ORDER_CONFIRMATION|ORDER_STATUS|PAYMENT_CONFIRMED|ADMIN_NEW_ORDER):[a-z0-9]+(:[A-Z]+)?:(CUSTOMER|ADMIN)$/);

/** Admin-only: retry a failed notification (never resends a delivered customer message). */
export async function retryNotificationAction(orderId, eventKey) {
  return runAdminAction("retry notification", async () => {
    const id = validate(idSchema, orderId);
    const key = validate(eventKeySchema, eventKey);
    if (key.split(":")[1] !== id) throw new Error("Notification does not belong to this order.");
    const result = await retryNotification(key);
    refresh(id);
    return result;
  });
}
