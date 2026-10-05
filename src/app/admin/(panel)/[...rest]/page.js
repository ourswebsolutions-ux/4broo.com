import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth/guards";

// Unknown admin URLs: authorise first (non-admins never learn what exists), then 404.
export default async function AdminUnknownPage() {
  await requireAdmin();
  notFound();
}
