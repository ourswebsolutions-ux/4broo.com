"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { clearOverridesAction, removeCredentialAction, saveSettingsAction, sendWhatsAppTestAction, testSmtpAction, testWhatsAppConnectionAction } from "@/actions/admin/settings";
import { Section, SelectField, TextArea, TextField, Toggle } from "@/components/admin/ui";
import { Button } from "@/components/ui/Button";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { Icon } from "@/components/ui/Icon";
import { Spinner } from "@/components/ui/Spinner";
import { useToast } from "@/components/ui/Toast";
import { SecretField, SourceTag, StatusPill, TestResult, dateTime, fieldId, sourceText } from "./fields";

const SECTION_KEYS = {
  whatsapp: ["whatsapp.baseUrl", "whatsapp.apiKey", "whatsapp.sessionId", "whatsapp.adminNumber", "whatsapp.enabled"],
  smtp: ["smtp.host", "smtp.port", "smtp.security", "smtp.username", "smtp.password", "smtp.fromName", "smtp.fromEmail", "smtp.enabled"],
  business: [
    "business.name",
    "business.whatsappNumber",
    "business.supportEmail",
    "business.phone",
    "business.websiteUrl",
    "business.address",
    "business.instagramUrl",
    "business.tiktokUrl",
    "business.facebookUrl",
    "business.youtubeUrl",
  ],
  notifications: [
    "notifications.customerOrderConfirmation",
    "notifications.customerStatusUpdates",
    "notifications.customerPayment",
    "notifications.customerEmailFallback",
    "notifications.adminNewOrderWhatsApp",
    "notifications.adminNewOrderEmail",
    "notifications.adminEmail",
  ],
};

const NAV = [
  { id: "status", label: "Integration status" },
  { id: "whatsapp", label: "WhatsApp API" },
  { id: "smtp", label: "SMTP email" },
  { id: "business", label: "Business contact" },
  { id: "notifications", label: "Notifications" },
  { id: "security", label: "Security" },
];

const toInput = (field) => (field.value === null || field.value === undefined ? "" : typeof field.value === "boolean" ? field.value : String(field.value));

/** Form state for one section: values, credential replacements, errors, dirty flag and actions. */
function useSectionForm(name, overview, onDirtyChange) {
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();
  const keys = SECTION_KEYS[name];
  // Sections remount (new key) after a save, so the initial values are fixed per mount.
  const [initial] = useState(() => Object.fromEntries(keys.filter((key) => !overview.fields[key].secret).map((key) => [key, toInput(overview.fields[key])])));
  const [values, setValues] = useState(initial);
  const [secrets, setSecrets] = useState({});
  const [errors, setErrors] = useState({});
  const [saving, startSaving] = useTransition();
  const [busyKey, setBusyKey] = useState(null);
  const submitting = useRef(false);

  const dirty = Object.keys(values).some((key) => values[key] !== initial[key]) || Object.values(secrets).some((v) => v.trim() !== "");
  useEffect(() => onDirtyChange(name, dirty), [name, dirty, onDirtyChange]);

  const set = (key, value) => {
    setValues((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [fieldId(key)]: undefined }));
  };
  const setSecret = (key, value) => {
    setSecrets((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [fieldId(key)]: undefined }));
  };

  const save = (event) => {
    event?.preventDefault();
    if (submitting.current || !dirty) return;
    submitting.current = true;
    setErrors({});
    startSaving(async () => {
      let result;
      try {
        result = await saveSettingsAction(name, { values, secrets });
      } catch {
        result = { ok: false, message: "Settings could not be saved. Check your connection and try again." };
      } finally {
        submitting.current = false;
      }
      if (!result.ok) {
        setErrors(result.fieldErrors ?? {});
        toast.error(result.message);
        return;
      }
      const { updated, replaced } = result.data;
      toast.success(updated.length || replaced.length ? `Saved${replaced.length ? ` · ${replaced.length} credential${replaced.length > 1 ? "s" : ""} replaced` : ""}.` : "Saved — values match the environment, so no override was stored.");
      setSecrets({});
      onDirtyChange(name, false);
      router.refresh();
    });
  };

  const removeCredential = async (field) => {
    const ok = await confirm({
      title: `Remove the saved ${field.label.toLowerCase()}?`,
      message: field.envAvailable
        ? `The value saved in admin will be deleted. ${field.envName} from the server environment will be used again.`
        : "The value saved in admin will be deleted. No environment value exists, so this integration will stop working until a new credential is added.",
      confirmLabel: "Remove credential",
      tone: "danger",
    });
    if (!ok) return;
    setBusyKey(field.key);
    try {
      const result = await removeCredentialAction(field.key);
      if (toast.fromResult(result, `${field.label} removed.`)) router.refresh();
    } catch {
      toast.error("The credential could not be removed. Check your connection and try again.");
    } finally {
      setBusyKey(null);
    }
  };

  const clearOverrides = async (title) => {
    const ok = await confirm({
      title: `Use environment values for ${title}?`,
      message: "Every value saved in admin for this section is removed, so the server environment (or built-in defaults) applies again. Saved credentials are kept — remove them individually.",
      confirmLabel: "Use environment values",
    });
    if (!ok) return;
    setBusyKey("__clear");
    try {
      const result = await clearOverridesAction(name);
      if (toast.fromResult(result, result.data?.removed.length ? "Overrides cleared — environment values apply." : "No overrides to clear.")) {
        onDirtyChange(name, false);
        router.refresh();
      }
    } catch {
      toast.error("Overrides could not be cleared. Check your connection and try again.");
    } finally {
      setBusyKey(null);
    }
  };

  const hasOverrides = keys.some((key) => !overview.fields[key].secret && overview.fields[key].stored);

  return { values, secrets, errors, set, setSecret, save, saving, dirty, removeCredential, clearOverrides, busyKey, hasOverrides };
}

function SaveBar({ form, title, disabled }) {
  return (
    <div className="mt-8 flex flex-col-reverse gap-3 border-t border-line pt-6 sm:flex-row sm:items-center sm:justify-between">
      {form.hasOverrides ? (
        <button type="button" onClick={() => form.clearOverrides(title)} disabled={form.busyKey === "__clear" || form.saving} className="eyebrow self-start py-2 !text-[0.625rem] text-subtle underline decoration-line underline-offset-[6px] hover:text-ink disabled:opacity-50">
          {form.busyKey === "__clear" ? "Clearing…" : "Reset to environment values"}
        </button>
      ) : (
        <span className="text-xs text-mute">No admin overrides — using environment / defaults.</span>
      )}
      <div className="flex items-center gap-4 self-end">
        {form.dirty ? (
          <span className="flex items-center gap-2 text-xs text-gold-deep" role="status">
            <span aria-hidden="true" className="size-1.5 rounded-full bg-gold-deep" /> Unsaved changes
          </span>
        ) : null}
        <Button type="submit" size="sm" disabled={!form.dirty || form.saving || disabled}>
          {form.saving ? <Spinner label="Saving" className="text-paper" /> : null}
          {form.saving ? "Saving" : "Save changes"}
        </Button>
      </div>
    </div>
  );
}

/** Text input bound to a setting, with its source shown under the field. */
function SettingInput({ form, field, type = "text", hint, placeholder, multiline = false, ...props }) {
  const id = fieldId(field.key);
  const shared = {
    id,
    label: (
      <span className="flex items-center gap-2">
        {field.label} <SourceTag field={field} />
      </span>
    ),
    value: form.values[field.key],
    error: form.errors[id],
    hint: `${hint ? `${hint} ` : ""}${sourceText(field)}.`,
    placeholder,
    disabled: form.saving,
    onChange: (event) => form.set(field.key, event.target.value),
  };
  return multiline ? <TextArea rows={3} {...shared} {...props} /> : <TextField type={type} {...shared} {...props} />;
}

function SettingToggle({ form, field, label, description }) {
  return (
    <div className="border-b border-line last:border-b-0">
      <Toggle
        id={fieldId(field.key)}
        label={
          <span className="flex items-center gap-2">
            {label ?? field.label} <SourceTag field={field} />
          </span>
        }
        description={description}
        checked={form.values[field.key] === true}
        onChange={(checked) => form.set(field.key, checked)}
        disabled={form.saving}
      />
    </div>
  );
}

function ReadOnlyLine({ label, value, note }) {
  return (
    <div className="flex flex-col gap-1 border border-dashed border-line px-4 py-3 sm:col-span-2">
      <span className="text-[0.8125rem] font-medium">{label}</span>
      <span className="text-sm text-subtle">
        <bdi dir="ltr">{value || "Not set"}</bdi> — {note}
      </span>
    </div>
  );
}

// ─── Sections ────────────────────────────────────────────────────────────────

function IntegrationStatus({ overview }) {
  const { status, encryption, databaseProblem } = overview;
  const card = (title, tone, label, lines) => (
    <div className="flex flex-col gap-3 bg-paper p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-display text-xl font-light">{title}</h3>
        <StatusPill tone={tone}>{label}</StatusPill>
      </div>
      <ul className="flex flex-col gap-1 text-xs leading-relaxed text-subtle">
        {lines.filter(Boolean).map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
    </div>
  );
  const integration = (s) => (!s.configured ? ["error", "Not configured"] : s.last && !s.last.ok ? ["warn", "Last test failed"] : !s.enabled ? ["neutral", "Turned off"] : s.lastSuccessAt ? ["ok", "Connected"] : ["warn", "Not tested"]);
  const [waTone, waLabel] = integration(status.whatsapp);
  const [smtpTone, smtpLabel] = integration(status.smtp);

  return (
    <Section id="status" title="Integration status" description="Live view of what this server will use right now.">
      <div className="grid gap-px border border-line bg-line sm:grid-cols-2 xl:grid-cols-4">
        {card("WhatsApp", waTone, waLabel, [
          status.whatsapp.configured ? "API key and session configured" : `Missing: ${status.whatsapp.missing.join(", ")}`,
          `Notifications ${status.whatsapp.enabled ? "on" : "off"}`,
          `Last test: ${status.whatsapp.last ? `${status.whatsapp.last.ok ? "passed" : "failed"} · ${dateTime(status.whatsapp.last.at)}` : "never"}`,
        ])}
        {card("Email (SMTP)", smtpTone, smtpLabel, [
          status.smtp.configured ? "Host, sign-in and sender configured" : `Missing: ${status.smtp.missing.join(", ")}`,
          `Notifications ${status.smtp.enabled ? "on" : "off"}`,
          `Last test: ${status.smtp.last ? `${status.smtp.last.ok ? "passed" : "failed"} · ${dateTime(status.smtp.last.at)}` : "never"}`,
        ])}
        {card("Credential encryption", encryption.configured ? "ok" : "warn", encryption.configured ? "Active" : "Not set up", [
          encryption.configured ? "AES-256-GCM with a server-only key" : encryption.problem,
          encryption.configured ? "Credentials can be saved here" : "Credentials can only come from the environment until it is set",
        ])}
        {card("Settings storage", databaseProblem ? "error" : "ok", databaseProblem ? "Unavailable" : "Ready", [databaseProblem ?? "Admin overrides are stored in the database", "Changes apply without a restart"])}
      </div>
    </Section>
  );
}

function WhatsAppSection({ overview, onDirtyChange }) {
  const form = useSectionForm("whatsapp", overview, onDirtyChange);
  const f = overview.fields;
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();
  const [testTo, setTestTo] = useState("");
  const [testError, setTestError] = useState(null);
  const [testing, setTesting] = useState(null);
  const [result, setResult] = useState(overview.status.whatsapp.last);

  const run = async (kind) => {
    if (testing) return;
    if (kind === "message") {
      const ok = await confirm({ title: "Send a test WhatsApp message?", message: `A clearly labelled test message is sent to ${testTo || "this number"} using the saved configuration. It costs one WAAPI message credit.`, confirmLabel: "Send test" });
      if (!ok) return;
    }
    setTesting(kind);
    setTestError(null);
    try {
      const response = kind === "connection" ? await testWhatsAppConnectionAction() : await sendWhatsAppTestAction(testTo);
      if (!response.ok) {
        setTestError(response.fieldErrors?.["whatsapp-testTo"] ?? null);
        toast.error(response.message);
        return;
      }
      setResult(response.data);
      (response.data.ok ? toast.success : toast.error)(response.data.ok ? "WhatsApp test passed." : "WhatsApp test failed — see the result below.");
      router.refresh();
    } catch {
      toast.error("The test could not run. Check your connection and try again.");
    } finally {
      setTesting(null);
    }
  };

  return (
    <form onSubmit={form.save} noValidate>
      <Section
        id="whatsapp"
        title="WhatsApp API"
        description="WAAPI credentials for order messages. Customers get WhatsApp first, with email as the fallback."
        actions={<StatusPill tone={overview.status.whatsapp.configured ? (overview.status.whatsapp.enabled ? "ok" : "neutral") : "error"}>{overview.status.whatsapp.configured ? (overview.status.whatsapp.enabled ? "Configured" : "Turned off") : "Not configured"}</StatusPill>}
      >
        <div className="grid gap-6 sm:grid-cols-2">
          <SettingInput form={form} field={f["whatsapp.baseUrl"]} type="url" inputMode="url" placeholder="https://waapi.axorawebsolutions.com" hint="The API origin; /api/v1/messages/text is added automatically." className="sm:col-span-2" />
          <SecretField field={f["whatsapp.apiKey"]} value={form.secrets["whatsapp.apiKey"] ?? ""} onChange={(v) => form.setSecret("whatsapp.apiKey", v)} error={form.errors["whatsapp-apiKey"]} onRemove={() => form.removeCredential(f["whatsapp.apiKey"])} removing={form.busyKey === "whatsapp.apiKey"} disabled={form.saving} hint="Sent as a Bearer token." />
          <SecretField field={f["whatsapp.sessionId"]} value={form.secrets["whatsapp.sessionId"] ?? ""} onChange={(v) => form.setSecret("whatsapp.sessionId", v)} error={form.errors["whatsapp-sessionId"]} onRemove={() => form.removeCredential(f["whatsapp.sessionId"])} removing={form.busyKey === "whatsapp.sessionId"} disabled={form.saving} hint="The connected WAAPI session that sends messages." />
          <SettingInput form={form} field={f["whatsapp.adminNumber"]} type="tel" inputMode="tel" placeholder="923001234567" hint="Receives new-order alerts. Country code, digits only." />
          <ReadOnlyLine label="Business WhatsApp contact number" value={f["business.whatsappNumber"].value ? `+${f["business.whatsappNumber"].value}` : ""} note="shown to customers; edit it under Business contact." />
          <div className="sm:col-span-2">
            <SettingToggle form={form} field={f["whatsapp.enabled"]} label="Send WhatsApp notifications" description="Off: customer messages go straight to the email fallback and admin WhatsApp alerts are skipped." />
          </div>
        </div>
        <SaveBar form={form} title="WhatsApp" />

        <div className="mt-8 flex flex-col gap-5 border border-line bg-bone/40 p-5 sm:p-6">
          <div className="flex flex-col gap-1">
            <h3 className="eyebrow text-ink">Test WhatsApp</h3>
            <p className="text-xs text-mute">Tests use the saved configuration — save changes first. Limited to 5 tests per 10 minutes. No order or payment data is touched.</p>
          </div>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
            <Button type="button" variant="secondary" size="sm" onClick={() => run("connection")} disabled={Boolean(testing) || form.dirty}>
              {testing === "connection" ? <Spinner label="Testing" /> : null}
              Test connection
            </Button>
            <span className="hidden text-xs text-mute lg:block lg:pb-3.5">or</span>
            <TextField id="whatsapp-testTo" label="Test recipient" type="tel" inputMode="tel" placeholder="923001234567" value={testTo} onChange={(event) => setTestTo(event.target.value)} error={testError} className="flex-1" />
            <Button type="button" size="sm" onClick={() => run("message")} disabled={Boolean(testing) || form.dirty || !testTo.trim()}>
              {testing === "message" ? <Spinner label="Sending" className="text-paper" /> : null}
              Send test message
            </Button>
          </div>
          <TestResult result={result} lastSuccessAt={overview.status.whatsapp.lastSuccessAt} />
        </div>
      </Section>
    </form>
  );
}

function SmtpSection({ overview, onDirtyChange }) {
  const form = useSectionForm("smtp", overview, onDirtyChange);
  const f = overview.fields;
  const router = useRouter();
  const toast = useToast();
  const [testTo, setTestTo] = useState("");
  const [testError, setTestError] = useState(null);
  const [testing, setTesting] = useState(null);
  const [result, setResult] = useState(overview.status.smtp.last);

  const run = async (kind) => {
    if (testing) return;
    setTesting(kind);
    setTestError(null);
    try {
      const response = await testSmtpAction(kind === "email" ? testTo : "");
      if (!response.ok) {
        setTestError(response.fieldErrors?.["smtp-testTo"] ?? null);
        toast.error(response.message);
        return;
      }
      setResult(response.data);
      (response.data.ok ? toast.success : toast.error)(response.data.ok ? "SMTP test passed." : "SMTP test failed — see the result below.");
      router.refresh();
    } catch {
      toast.error("The test could not run. Check your connection and try again.");
    } finally {
      setTesting(null);
    }
  };

  const sender = `${form.values["smtp.fromName"] || f["smtp.fromName"].fallback || "4 BRO"} <${form.values["smtp.fromEmail"] || "sender@example.com"}>`;

  return (
    <form onSubmit={form.save} noValidate>
      <Section
        id="smtp"
        title="SMTP email"
        description="Outgoing mail for the customer email fallback, admin alerts and password resets."
        actions={<StatusPill tone={overview.status.smtp.configured ? (overview.status.smtp.enabled ? "ok" : "neutral") : "error"}>{overview.status.smtp.configured ? (overview.status.smtp.enabled ? "Configured" : "Turned off") : "Not configured"}</StatusPill>}
      >
        <div className="grid gap-6 sm:grid-cols-2">
          <SettingInput form={form} field={f["smtp.host"]} placeholder="smtp.gmail.com" autoComplete="off" spellCheck={false} />
          <div className="grid grid-cols-[minmax(0,7rem)_minmax(0,1fr)] gap-4">
            <SettingInput form={form} field={f["smtp.port"]} inputMode="numeric" placeholder="465" />
            <SelectField id="smtp-security" label={<span className="flex items-center gap-2">Security <SourceTag field={f["smtp.security"]} /></span>} value={form.values["smtp.security"] || "auto"} error={form.errors["smtp-security"]} onChange={(event) => form.set("smtp.security", event.target.value)} disabled={form.saving} hint={sourceText(f["smtp.security"])}>
              <option value="auto">Automatic (TLS on 465)</option>
              <option value="tls">TLS / SSL (implicit)</option>
              <option value="starttls">STARTTLS</option>
            </SelectField>
          </div>
          <SettingInput form={form} field={f["smtp.username"]} placeholder="info.axoraweb@gmail.com" autoComplete="off" spellCheck={false} className="sm:col-span-2" />
          <SecretField field={f["smtp.password"]} value={form.secrets["smtp.password"] ?? ""} onChange={(v) => form.setSecret("smtp.password", v)} error={form.errors["smtp-password"]} onRemove={() => form.removeCredential(f["smtp.password"])} removing={form.busyKey === "smtp.password"} disabled={form.saving} hint="For Gmail use a Google App Password, not the account password." />
          <SettingInput form={form} field={f["smtp.fromName"]} placeholder="4 BRO" maxLength={80} />
          <SettingInput form={form} field={f["smtp.fromEmail"]} type="email" placeholder="info.axoraweb@gmail.com" autoComplete="off" />
          <p className="-mt-2 text-xs text-mute sm:col-span-2">
            Emails are sent as <bdi dir="ltr" className="font-medium text-ink">{sender}</bdi>
          </p>
          <div className="sm:col-span-2">
            <SettingToggle form={form} field={f["smtp.enabled"]} label="Send email notifications" description="Off: no customer fallback emails or admin email alerts. Password-reset emails are still sent." />
          </div>
        </div>
        <SaveBar form={form} title="SMTP" />

        <div className="mt-8 flex flex-col gap-5 border border-line bg-bone/40 p-5 sm:p-6">
          <div className="flex flex-col gap-1">
            <h3 className="eyebrow text-ink">Test SMTP</h3>
            <p className="text-xs text-mute">Tests use the saved configuration — save changes first. Limited to 5 tests per 10 minutes.</p>
          </div>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
            <Button type="button" variant="secondary" size="sm" onClick={() => run("connection")} disabled={Boolean(testing) || form.dirty}>
              {testing === "connection" ? <Spinner label="Testing" /> : null}
              Verify connection
            </Button>
            <span className="hidden text-xs text-mute lg:block lg:pb-3.5">or</span>
            <TextField id="smtp-testTo" label="Test recipient" type="email" placeholder="you@example.com" value={testTo} onChange={(event) => setTestTo(event.target.value)} error={testError} className="flex-1" />
            <Button type="button" size="sm" onClick={() => run("email")} disabled={Boolean(testing) || form.dirty || !testTo.trim()}>
              {testing === "email" ? <Spinner label="Sending" className="text-paper" /> : null}
              Send test email
            </Button>
          </div>
          <TestResult result={result} lastSuccessAt={overview.status.smtp.lastSuccessAt} />
        </div>
      </Section>
    </form>
  );
}

function BusinessSection({ overview, onDirtyChange }) {
  const form = useSectionForm("business", overview, onDirtyChange);
  const f = overview.fields;
  return (
    <form onSubmit={form.save} noValidate>
      <Section id="business" title="Business contact" description="Shown in the footer, contact page, WhatsApp button and customer emails. Leave a field empty to use the environment value.">
        <div className="grid gap-6 sm:grid-cols-2">
          <SettingInput form={form} field={f["business.name"]} placeholder="4 BRO" maxLength={80} />
          <SettingInput form={form} field={f["business.websiteUrl"]} type="url" inputMode="url" placeholder="https://4broo.com" hint="Shown in customer emails. Page links and SEO use NEXT_PUBLIC_SITE_URL." />
          <SettingInput form={form} field={f["business.whatsappNumber"]} type="tel" inputMode="tel" placeholder="923001234567" hint="Customer chat button and contact links." />
          <SettingInput form={form} field={f["business.phone"]} type="tel" inputMode="tel" placeholder="923001234567" />
          <SettingInput form={form} field={f["business.supportEmail"]} type="email" placeholder="info.axoraweb@gmail.com" hint="Also the reply-to address of customer emails." className="sm:col-span-2" />
          <SettingInput form={form} field={f["business.address"]} multiline maxLength={300} showCount placeholder="Optional" className="sm:col-span-2" />
        </div>
        <h3 className="eyebrow mb-4 mt-10 text-ink">Social profiles</h3>
        <div className="grid gap-6 sm:grid-cols-2">
          {["instagramUrl", "tiktokUrl", "facebookUrl", "youtubeUrl"].map((name) => (
            <SettingInput key={name} form={form} field={f[`business.${name}`]} type="url" inputMode="url" placeholder="https://" />
          ))}
        </div>
        <SaveBar form={form} title="business contact" />
      </Section>
    </form>
  );
}

function NotificationsSection({ overview, onDirtyChange }) {
  const form = useSectionForm("notifications", overview, onDirtyChange);
  const f = overview.fields;
  const adminEmailFallback = f["smtp.fromEmail"].value;
  return (
    <form onSubmit={form.save} noValidate>
      <Section id="notifications" title="Notification preferences" description="Which messages are sent. The delivery order never changes: WhatsApp first; email only if WhatsApp fails.">
        <div className="grid gap-10 lg:grid-cols-2">
          <div className="flex flex-col">
            <h3 className="eyebrow mb-2 text-ink">Customers</h3>
            <ol className="mb-4 flex flex-col gap-1 border-s-2 border-gold ps-4 text-xs leading-relaxed text-subtle">
              <li>1. WhatsApp is tried first — if it is delivered, no email is sent.</li>
              <li>2. If WhatsApp fails or is off, the email fallback is sent.</li>
              <li>3. If both fail, the order is kept and the failure is logged for retry.</li>
            </ol>
            <SettingToggle form={form} field={f["notifications.customerOrderConfirmation"]} label="Order confirmation" description="When a cash-on-delivery order is placed." />
            <SettingToggle form={form} field={f["notifications.customerStatusUpdates"]} label="Order status updates" description="Confirmed, processing, packed, shipped, delivered, cancelled." />
            <SettingToggle form={form} field={f["notifications.customerPayment"]} label="Payment confirmation" description="When an online payment is verified." />
            <SettingToggle form={form} field={f["notifications.customerEmailFallback"]} label="Email fallback" description="Email the customer when WhatsApp cannot be delivered." />
          </div>
          <div className="flex flex-col">
            <h3 className="eyebrow mb-2 text-ink">Admin alerts</h3>
            <p className="mb-4 text-xs leading-relaxed text-subtle">WhatsApp and email alerts are sent independently for every new order.</p>
            <SettingToggle form={form} field={f["notifications.adminNewOrderWhatsApp"]} label="New order · WhatsApp" description="Sent to the admin WhatsApp number." />
            <SettingToggle form={form} field={f["notifications.adminNewOrderEmail"]} label="New order · Email" description="Sent to the admin notification email." />
            <div className="mt-6 flex flex-col gap-6">
              <ReadOnlyLine label="Admin WhatsApp number" value={f["whatsapp.adminNumber"].value ? `+${f["whatsapp.adminNumber"].value}` : ""} note="edit it under WhatsApp API." />
              <SettingInput form={form} field={f["notifications.adminEmail"]} type="email" placeholder={adminEmailFallback ?? "orders@example.com"} hint={adminEmailFallback ? `Empty: alerts go to the sender address (${adminEmailFallback}).` : undefined} />
            </div>
          </div>
        </div>
        <SaveBar form={form} title="notification preferences" />
      </Section>
    </form>
  );
}

function SecuritySection({ overview }) {
  return (
    <Section id="security" title="Security & configuration" description="How settings are resolved and protected.">
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
        <div className="flex flex-col gap-5 text-sm leading-relaxed text-subtle">
          <div className="flex flex-col gap-2">
            <h3 className="eyebrow text-ink">Priority</h3>
            <ol className="flex flex-col gap-1">
              <li>
                <SourceTag field={{ source: "database" }} /> Values saved on this page
              </li>
              <li>
                <SourceTag field={{ source: "environment" }} /> Server environment variables (.env)
              </li>
              <li>
                <SourceTag field={{ source: "default" }} /> Built-in defaults, otherwise not configured
              </li>
            </ol>
          </div>
          <p>
            <strong className="font-medium text-ink">Return to the environment:</strong> use “Reset to environment values” in a section, or “Remove” on a credential. Clearing a field and saving also removes that override.
          </p>
          <p>
            <strong className="font-medium text-ink">Credentials</strong> are encrypted with AES-256-GCM using <code className="bg-bone px-1 text-xs">SETTINGS_ENCRYPTION_KEY</code>, which lives only in the server environment. They are never sent to the browser or written to logs. Back the key up securely — without it, saved credentials cannot be decrypted and must be re-entered.
          </p>
          <p>Only administrators can view or change settings; every change and test is recorded below.</p>
        </div>
        <div className="flex min-w-0 flex-col gap-3">
          <h3 className="eyebrow text-ink">Recent activity</h3>
          {overview.history.length ? (
            <ul className="flex flex-col divide-y divide-line border border-line">
              {overview.history.map((entry) => (
                <li key={entry.id} className="flex flex-col gap-1 px-4 py-3">
                  <span className="flex flex-wrap items-center justify-between gap-2 text-sm">
                    <span className="flex items-center gap-2 font-medium">
                      {entry.success === false ? <Icon name="alert" className="size-3.5 text-danger" /> : <Icon name="check" className="size-3.5 text-success" />}
                      {entry.action}
                      <span className="eyebrow !text-[0.5625rem] text-mute">{entry.category.toLowerCase()}</span>
                    </span>
                    <span className="text-xs text-mute">{dateTime(entry.at)}</span>
                  </span>
                  <span className="text-xs text-subtle [overflow-wrap:anywhere]">
                    {entry.outcome}
                    {entry.keys ? ` · ${entry.keys}` : ""} · by {entry.actor}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="border border-dashed border-line px-4 py-6 text-center text-sm text-mute">No settings changes recorded yet.</p>
          )}
        </div>
      </div>
    </Section>
  );
}

export function SettingsPanel({ overview }) {
  const [dirtySections, setDirtySections] = useState({});
  const onDirtyChange = useCallback((name, dirty) => setDirtySections((current) => (current[name] === dirty ? current : { ...current, [name]: dirty })), []);
  const anyDirty = Object.values(dirtySections).some(Boolean);

  useEffect(() => {
    if (!anyDirty) return undefined;
    const warn = (event) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [anyDirty]);

  // Remount sections after a save/refresh so their state matches the server.
  const version = (keys) => JSON.stringify(keys.map((key) => [overview.fields[key].source, overview.fields[key].value ?? overview.fields[key].configured, overview.fields[key].storedAt]));

  return (
    <div className="grid gap-8 xl:grid-cols-[12rem_minmax(0,1fr)]">
      <nav aria-label="Settings sections" className="-mx-4 overflow-x-auto px-4 xl:mx-0 xl:px-0">
        <ul className="flex gap-1 xl:sticky xl:top-8 xl:flex-col">
          {NAV.map((item) => (
            <li key={item.id}>
              <a href={`#${item.id}`} className="eyebrow flex items-center justify-between gap-3 whitespace-nowrap px-3 py-2.5 !text-[0.625rem] text-ink/75 hover:bg-bone hover:text-ink">
                {item.label}
                {dirtySections[item.id] ? <span aria-label="unsaved changes" className="size-1.5 rounded-full bg-gold-deep" /> : null}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <div className="flex min-w-0 flex-col gap-8">
        {overview.databaseProblem ? (
          <p role="alert" className="border border-danger/30 bg-danger/5 px-5 py-4 text-sm text-danger">
            {overview.databaseProblem} Apply the latest database migration (<code>npm run db:deploy</code>) to save settings here.
          </p>
        ) : null}
        <IntegrationStatus overview={overview} />
        <WhatsAppSection key={`wa-${version(SECTION_KEYS.whatsapp)}`} overview={overview} onDirtyChange={onDirtyChange} />
        <SmtpSection key={`smtp-${version(SECTION_KEYS.smtp)}`} overview={overview} onDirtyChange={onDirtyChange} />
        <BusinessSection key={`biz-${version(SECTION_KEYS.business)}`} overview={overview} onDirtyChange={onDirtyChange} />
        <NotificationsSection key={`notify-${version(SECTION_KEYS.notifications)}`} overview={overview} onDirtyChange={onDirtyChange} />
        <SecuritySection overview={overview} />
      </div>
    </div>
  );
}
