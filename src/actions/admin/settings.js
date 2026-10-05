"use server";

// Admin settings mutations and integration tests. Every action re-authorises the
// ADMIN role server-side (runAdminAction); Next.js Server Actions also reject
// cross-origin POSTs (Origin must match the host), which covers CSRF.
// Results never include credential values.
import { revalidatePath } from "next/cache";
import { revalidateStorefront, runAdminAction } from "@/lib/actions";
import { ValidationError } from "@/lib/errors";
import { clearOverrides, removeCredential, saveSettings, sendWhatsAppTest, testSmtp, testWhatsAppConnection } from "@/services/settingsService";

const SECTIONS = new Set(["whatsapp", "smtp", "business", "notifications"]);

function section(name) {
  if (!SECTIONS.has(name)) throw new ValidationError("Unknown settings section.");
  return name;
}

/** Plain object of string/boolean/number values only (no prototype tricks, bounded size). */
function plain(input, { strings = false } = {}) {
  if (!input || typeof input !== "object" || Array.isArray(input)) return {};
  const entries = Object.entries(input).slice(0, 40);
  return Object.fromEntries(
    entries.filter(([key, value]) => /^[a-z]+\.[a-zA-Z]+$/.test(key) && (strings ? typeof value === "string" : ["string", "boolean", "number"].includes(typeof value)) && String(value).length <= 600),
  );
}

const refresh = () => {
  revalidatePath("/admin/settings");
  // Contact details appear in the storefront layout (footer, WhatsApp button, contact page).
  revalidateStorefront();
};

export async function saveSettingsAction(sectionName, payload) {
  return runAdminAction("save settings", async (admin) => {
    const result = await saveSettings(section(sectionName), { values: plain(payload?.values), secrets: plain(payload?.secrets, { strings: true }) }, admin);
    refresh();
    return result;
  });
}

export async function removeCredentialAction(key) {
  return runAdminAction("remove credential", async (admin) => {
    const result = await removeCredential(String(key ?? ""), admin);
    refresh();
    return result;
  });
}

export async function clearOverridesAction(sectionName) {
  return runAdminAction("clear setting overrides", async (admin) => {
    const result = await clearOverrides(section(sectionName), admin);
    refresh();
    return result;
  });
}

export async function testWhatsAppConnectionAction() {
  return runAdminAction("test whatsapp", async (admin) => {
    const result = await testWhatsAppConnection(admin);
    revalidatePath("/admin/settings");
    return result;
  });
}

export async function sendWhatsAppTestAction(to) {
  return runAdminAction("send whatsapp test", async (admin) => {
    const result = await sendWhatsAppTest(String(to ?? "").slice(0, 32), admin);
    revalidatePath("/admin/settings");
    return result;
  });
}

export async function testSmtpAction(to) {
  return runAdminAction("test smtp", async (admin) => {
    const result = await testSmtp(String(to ?? "").slice(0, 191), admin);
    revalidatePath("/admin/settings");
    return result;
  });
}
