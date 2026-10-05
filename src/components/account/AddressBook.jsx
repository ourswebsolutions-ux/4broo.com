"use client";

import { useActionState, useState, useTransition } from "react";
import { deleteAddressAction, saveAddressAction, setDefaultAddressAction } from "@/actions/account";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Drawer } from "@/components/ui/Drawer";
import { EmptyState } from "@/components/ui/EmptyState";
import { Field } from "@/components/ui/Field";
import { Icon } from "@/components/ui/Icon";
import { Spinner } from "@/components/ui/Spinner";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { useToast } from "@/components/ui/Toast";
import { useLocale, useT } from "@/i18n/I18nProvider";
import { cn } from "@/utils/cn";

const LINK = "inline-flex min-h-10 items-center text-xs text-subtle underline decoration-line underline-offset-4 transition-colors hover:text-ink disabled:pointer-events-none disabled:opacity-50";

function AddressForm({ address, onSaved }) {
  const t = useT();
  const locale = useLocale();
  const [state, action] = useActionState(async (previous, formData) => {
    const result = await saveAddressAction(previous, formData);
    if (result.ok) onSaved(result.message);
    return result;
  }, undefined);
  const values = state?.ok === false ? state.values : address ? { ...address, phone: `+${address.phone}` } : { country: "Pakistan" };
  const errors = state?.fieldErrors ?? {};

  return (
    <form action={action} className="flex flex-col gap-6" noValidate>
      {state?.ok === false && !Object.keys(errors).length ? <Alert tone="error">{state.message}</Alert> : null}
      <input type="hidden" name="locale" value={locale} />
      {address ? <input type="hidden" name="id" value={address.id} /> : null}
      <Field label={t("address.fullName")} name="fullName" autoComplete="name" required maxLength={160} defaultValue={values.fullName} error={errors.fullName} />
      <Field label={t("address.phone")} name="phone" type="tel" dir="ltr" inputMode="tel" autoComplete="tel" placeholder="+92 300 1234567" required defaultValue={values.phone} error={errors.phone} />
      <Field label={t("address.addressLine")} name="addressLine" autoComplete="street-address" required maxLength={255} hint={t("address.addressHint")} defaultValue={values.addressLine} error={errors.addressLine} />
      <div className="grid gap-6 sm:grid-cols-2">
        <Field label={t("address.city")} name="city" autoComplete="address-level2" required maxLength={100} defaultValue={values.city} error={errors.city} />
        <Field label={`${t("address.postalCode")} (${t("commonActions.optional")})`} name="postalCode" dir="ltr" autoComplete="postal-code" maxLength={20} defaultValue={values.postalCode ?? ""} error={errors.postalCode} />
      </div>
      <div className="grid gap-6 sm:grid-cols-2">
        <Field label={t("address.country")} name="country" autoComplete="country-name" required maxLength={60} defaultValue={values.country} error={errors.country} />
        <Field label={`${t("address.label")} (${t("commonActions.optional")})`} name="label" maxLength={40} hint={t("address.labelHint")} defaultValue={values.label ?? ""} error={errors.label} />
      </div>
      {!address?.isDefault ? (
        <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm">
          <input type="checkbox" name="isDefault" defaultChecked={values.isDefault === true || values.isDefault === "on"} className="size-4.5 accent-ink" />
          {t("address.useAsDefault")}
        </label>
      ) : null}
      <SubmitButton pendingLabel={t("commonActions.saving")}>{t("address.save")}</SubmitButton>
    </form>
  );
}

/** Address book: cards, add/edit in a side panel, set default, delete with confirmation. */
export function AddressBook({ addresses, max }) {
  const t = useT();
  const locale = useLocale();
  const toast = useToast();
  const [editing, setEditing] = useState(null); // null | "new" | address
  const [confirming, setConfirming] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [, startTransition] = useTransition();

  const run = (id, action, after) => {
    setBusyId(id);
    startTransition(async () => {
      const result = await action({ id, locale });
      setBusyId(null);
      if (result.ok) toast.success(result.data.message);
      else toast.error(result.message);
      after?.();
    });
  };

  const formOpen = editing !== null;

  return (
    <div className="flex flex-col gap-8">
      {addresses.length ? (
        <ul className="grid gap-5 md:grid-cols-2">
          {addresses.map((address) => {
            const busy = busyId === address.id;
            return (
              <li
                key={address.id}
                className={cn(
                  "flex animate-[fade_400ms_ease-out_both] flex-col gap-4 border p-6 transition-[border-color,opacity] duration-300 sm:p-7",
                  address.isDefault ? "border-ink" : "border-line hover:border-mute",
                  busy && "opacity-60",
                )}
                aria-busy={busy || undefined}
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="eyebrow !text-[0.625rem] text-mute">{address.label || t("address.title")}</p>
                  {address.isDefault ? (
                    <span className="eyebrow inline-flex items-center gap-1.5 bg-ink px-2.5 py-1 !text-[0.5625rem] text-paper">
                      <Icon name="check" className="size-3 text-gold" strokeWidth={2} />
                      {t("address.default")}
                    </span>
                  ) : null}
                </div>
                <address className="flex flex-col gap-1 text-sm not-italic leading-relaxed">
                  <span className="font-medium">{address.fullName}</span>
                  <span>{address.addressLine}</span>
                  <span>{[address.city, address.postalCode].filter(Boolean).join(" ")}</span>
                  <span>{address.country}</span>
                  <bdi dir="ltr" className="text-subtle">
                    +{address.phone}
                  </bdi>
                </address>
                <div className="mt-auto flex flex-wrap items-center gap-x-5 gap-y-1 border-t border-line pt-3">
                  <button type="button" className={LINK} disabled={busy} onClick={() => setEditing(address)}>
                    {t("commonActions.edit")}
                  </button>
                  {!address.isDefault ? (
                    <button type="button" className={LINK} disabled={busy} onClick={() => run(address.id, setDefaultAddressAction)}>
                      {t("address.makeDefault")}
                    </button>
                  ) : null}
                  <button type="button" className={cn(LINK, "hover:text-danger")} disabled={busy} onClick={() => setConfirming(address)}>
                    {t("address.delete")}
                  </button>
                  {busy ? <Spinner className="ms-auto text-mute" /> : null}
                </div>
              </li>
            );
          })}
          {addresses.length < max ? (
            <li>
              <button
                type="button"
                onClick={() => setEditing("new")}
                className="flex h-full min-h-56 w-full flex-col items-center justify-center gap-3 border border-dashed border-line text-sm text-subtle transition-colors duration-300 hover:border-ink hover:text-ink"
              >
                <Icon name="plus" className="size-5" />
                {t("address.add")}
              </button>
            </li>
          ) : null}
        </ul>
      ) : (
        <EmptyState icon="mapPin" title={t("address.empty")} description={t("address.emptyText")} action={<Button onClick={() => setEditing("new")}>{t("address.add")}</Button>} />
      )}

      <Drawer open={formOpen} onClose={() => setEditing(null)} label={editing === "new" ? t("address.new") : t("address.edit")} side="end" closeLabel={t("common.close")}>
        <div className="flex h-full flex-col">
          <div className="flex h-16 shrink-0 items-center border-b border-line px-6 pe-16">
            <h2 className="eyebrow">{editing === "new" ? t("address.new") : t("address.edit")}</h2>
          </div>
          <div className="flex-1 overflow-y-auto overscroll-contain px-6 py-8">
            {formOpen ? (
              <AddressForm
                key={editing === "new" ? "new" : editing.id}
                address={editing === "new" ? null : editing}
                onSaved={(message) => {
                  setEditing(null);
                  toast.success(message);
                }}
              />
            ) : null}
          </div>
        </div>
      </Drawer>

      <Drawer open={Boolean(confirming)} onClose={() => setConfirming(null)} label={t("address.deleteTitle")} side="modal" closeLabel={t("common.close")}>
        <div className="flex flex-col gap-6 px-6 pb-8 pt-10 sm:px-10">
          <div className="flex flex-col gap-2">
            <h2 className="headline text-title">{t("address.deleteTitle")}</h2>
            <p className="text-sm text-subtle">{t("address.deleteText")}</p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button variant="secondary" fullWidth onClick={() => setConfirming(null)}>
              {t("commonActions.cancel")}
            </Button>
            <Button
              fullWidth
              className="!bg-danger hover:!bg-danger/90"
              onClick={() => {
                const id = confirming.id;
                setConfirming(null);
                run(id, deleteAddressAction);
              }}
            >
              {t("address.delete")}
            </Button>
          </div>
        </div>
      </Drawer>
    </div>
  );
}
