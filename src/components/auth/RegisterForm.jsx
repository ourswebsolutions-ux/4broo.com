"use client";

import { useActionState } from "react";
import { registerAction } from "@/actions/auth";
import { Alert } from "@/components/ui/Alert";
import { Field } from "@/components/ui/Field";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { useLocale, useT } from "@/i18n/I18nProvider";

export function RegisterForm({ redirectTo, passwordMinLength }) {
  const t = useT();
  const locale = useLocale();
  const [state, formAction] = useActionState(registerAction, undefined);
  const errors = state?.fieldErrors ?? {};

  return (
    <form action={formAction} className="flex flex-col gap-7" noValidate>
      <Alert tone="error">{state?.message}</Alert>

      {redirectTo ? <input type="hidden" name="redirectTo" value={redirectTo} /> : null}
      <input type="hidden" name="locale" value={locale} />

      <div className="grid gap-7 sm:grid-cols-2">
        <Field label={t("auth.firstName")} name="firstName" autoComplete="given-name" required maxLength={80} defaultValue={state?.values?.firstName} error={errors.firstName} />
        <Field label={t("auth.lastName")} name="lastName" autoComplete="family-name" required maxLength={80} defaultValue={state?.values?.lastName} error={errors.lastName} />
      </div>
      <Field label={t("auth.email")} name="email" type="email" autoComplete="email" dir="ltr" required defaultValue={state?.values?.email} error={errors.email} />
      <Field
        label={t("auth.password")}
        name="password"
        type="password"
        autoComplete="new-password"
        dir="ltr"
        required
        minLength={passwordMinLength}
        hint={t("auth.passwordHint")}
        error={errors.password}
      />
      <Field label={t("auth.confirmPassword")} name="confirmPassword" type="password" autoComplete="new-password" dir="ltr" required error={errors.confirmPassword} />

      <SubmitButton pendingLabel={t("auth.creating")}>{t("auth.createTitle")}</SubmitButton>
    </form>
  );
}
