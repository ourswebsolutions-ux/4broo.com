import { SettingsPanel } from "@/components/admin/settings/SettingsPanel";
import { requireAdmin } from "@/lib/auth/guards";
import { getSettingsOverview } from "@/services/settingsService";

export const metadata = { title: "Settings" };

/** Integration credentials, business contact and notification preferences (ADMIN only). */
export default async function AdminSettingsPage() {
  // Pages render in parallel with layouts, so each admin page re-asserts access.
  await requireAdmin();
  // The overview carries no credential values — only whether each is configured and its source.
  const overview = await getSettingsOverview();

  return (
    <div className="flex flex-col gap-10">
      <header className="flex flex-col gap-3">
        <p className="eyebrow text-mute">Configuration</p>
        <h1 className="font-display text-display-sm font-light">Settings</h1>
        <p className="max-w-2xl text-sm leading-relaxed text-subtle">
          Manage WhatsApp and email delivery, the contact details customers see, and which notifications are sent. Changes apply immediately — no restart or .env edit needed.
        </p>
      </header>
      <SettingsPanel overview={overview} />
    </div>
  );
}
