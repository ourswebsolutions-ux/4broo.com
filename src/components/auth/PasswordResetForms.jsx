"use client";

import { useActionState } from "react";
import { forgotPasswordAction, resetPasswordAction } from "@/actions/auth";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { useLocale, useT } from "@/i18n/I18nProvider";

/** Step 1: request a link. The answer is the same whether or not the email exists. */
export function ForgotPasswordForm() {
  const t = useT();
  const locale = useLocale();
  const [state, formAction] = useActionState(forgotPasswordAction, undefined);

  if (state?.success) {
    return (
      <div className="flex flex-col gap-7">
        <Alert tone="success">{state.success}</Alert>
        <Button href="/login" variant="secondary" fullWidth>
          {t("auth.backToSignIn")}
        </Button>
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-7" noValidate>
      <Alert tone="error">{state?.message}</Alert>
      <input type="hidden" name="locale" value={locale} />
      <Field label={t("auth.email")} name="email" type="email" autoComplete="email" dir="ltr" required defaultValue={state?.values?.email} error={state?.fieldErrors?.email} />
      <SubmitButton pendingLabel={t("auth.sending")}>{t("auth.sendLink")}</SubmitButton>
    </form>
  );
}

/** Step 2: choose a new password with the emailed token. */
export function ResetPasswordForm({ token }) {
  const t = useT();
  const locale = useLocale();
  const [state, formAction] = useActionState(resetPasswordAction, undefined);
  const errors = state?.fieldErrors ?? {};

  if (state?.invalid) {
    return (
      <div className="flex flex-col gap-7">
        <Alert tone="error">{state.message}</Alert>
        <Button href="/forgot-password" fullWidth>
          {t("auth.requestNew")}
        </Button>
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-7" noValidate>
      <Alert tone="error">{state?.message}</Alert>
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="token" value={token} />
      <Field label={t("auth.newPassword")} name="password" type="password" autoComplete="new-password" dir="ltr" required hint={t("auth.passwordHint")} error={errors.password} />
      <Field label={t("auth.confirmPassword")} name="confirmPassword" type="password" autoComplete="new-password" dir="ltr" required error={errors.confirmPassword} />
      <SubmitButton pendingLabel={t("commonActions.saving")}>{t("auth.savePassword")}</SubmitButton>
    </form>
  );
}
