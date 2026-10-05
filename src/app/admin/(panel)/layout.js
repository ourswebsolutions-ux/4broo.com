import { AdminShell } from "@/components/admin/AdminShell";
import { requireAdmin } from "@/lib/auth/guards";

// Server-side gate for every admin page. Non-admins receive a 404.
export default async function AdminPanelLayout({ children }) {
  const admin = await requireAdmin();
  return <AdminShell admin={admin}>{children}</AdminShell>;
}
