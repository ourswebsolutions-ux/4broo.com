"use client";

import { useActionState } from "react";
import { changePasswordAction, updateProfileAction } from "@/actions/account";
import { Alert } from "@/components/ui/Alert";
import { Field } from "@/components/ui/Field";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { useLocale, useT } from "@/i18n/I18nProvider";

function Status({ state }) {
  if (!state) return null;
  return state.ok ? <Alert tone="success">{state.message}</Alert> : <Alert tone="error">{state.message}</Alert>;
}

export function ProfileForm({ profile }) {
  const t = useT();
  const locale = useLocale();
  const [state, action] = useActionState(updateProfileAction, undefined);
  const values = state?.ok === false ? state.values : profile;
  const errors = state?.fieldErrors ?? {};

  return (
    <form action={action} className="flex flex-col gap-7" noValidate>
      <Status state={state} />
      <input type="hidden" name="locale" value={locale} />
      <div className="grid gap-7 sm:grid-cols-2">
        <Field label={t("auth.firstName")} name="firstName" autoComplete="given-name" required maxLength={80} defaultValue={values?.firstName} error={errors.firstName} />
        <Field label={t("auth.lastName")} name="lastName" autoComplete="family-name" required maxLength={80} defaultValue={values?.lastName} error={errors.lastName} />
      </div>
      <Field label={t("account.email")} name="email-display" type="email" dir="ltr" value={profile.email} readOnly disabled hint={t("account.emailLocked")} />
      <Field
        label={`${t("account.phone")} (${t("commonActions.optional")})`}
        name="phone"
        type="tel"
        dir="ltr"
        autoComplete="tel"
        inputMode="tel"
        placeholder="+92 300 1234567"
        defaultValue={values?.phone ? (state?.ok === false ? values.phone : `+${values.phone}`) : ""}
        error={errors.phone}
      />
      <SubmitButton fullWidth={false} pendingLabel={t("commonActions.saving")} className="self-start">
        {t("account.saveChanges")}
      </SubmitButton>
    </form>
  );
}

export function PasswordForm() {
  const t = useT();
  const locale = useLocale();
  const [state, action] = useActionState(changePasswordAction, undefined);
  const errors = state?.fieldErrors ?? {};

  return (
    // key: clear the fields after a successful change
    <form key={state?.ok ? state.at : "form"} action={action} className="flex flex-col gap-7" noValidate>
      <Status state={state} />
      <input type="hidden" name="locale" value={locale} />
      <Field label={t("account.currentPassword")} name="currentPassword" type="password" dir="ltr" autoComplete="current-password" required error={errors.currentPassword} />
      <div className="grid gap-7 sm:grid-cols-2">
        <Field label={t("auth.newPassword")} name="newPassword" type="password" dir="ltr" autoComplete="new-password" required hint={t("auth.passwordHint")} error={errors.newPassword} />
        <Field label={t("auth.confirmPassword")} name="confirmPassword" type="password" dir="ltr" autoComplete="new-password" required error={errors.confirmPassword} />
      </div>
      <SubmitButton variant="secondary" fullWidth={false} pendingLabel={t("commonActions.saving")} className="self-start">
        {t("account.changePassword")}
      </SubmitButton>
    </form>
  );
}
