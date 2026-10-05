"use client";

import { useActionState } from "react";
import { Alert } from "@/components/ui/Alert";
import { Field } from "@/components/ui/Field";
import { SubmitButton } from "@/components/ui/SubmitButton";
import Link from "@/i18n/Link";

const ENGLISH = { email: "Email", password: "Password", submit: "Sign in", pending: "Signing in" };

/**
 * Shared email/password sign-in form. The Server Action decides which roles
 * may sign in (customer login vs. admin login). Labels come from the page
 * (translated on the storefront, English in the admin).
 */
export function LoginForm({ action, redirectTo, locale, copy = ENGLISH, forgot, notice }) {
  const [state, formAction] = useActionState(action, undefined);

  return (
    <form action={formAction} className="flex flex-col gap-7" noValidate>
      <Alert tone="error">{state?.message}</Alert>
      {!state ? <Alert tone="success">{notice}</Alert> : null}

      {redirectTo ? <input type="hidden" name="redirectTo" value={redirectTo} /> : null}
      {locale ? <input type="hidden" name="locale" value={locale} /> : null}

      <Field label={copy.email} name="email" type="email" autoComplete="email" dir="ltr" required defaultValue={state?.values?.email} error={state?.fieldErrors?.email} />
      <div className="flex flex-col gap-3">
        <Field label={copy.password} name="password" type="password" autoComplete="current-password" dir="ltr" required error={state?.fieldErrors?.password} />
        {forgot ? (
          <Link href={forgot.href} className="self-end py-1 text-xs text-subtle underline decoration-line underline-offset-4 hover:text-ink">
            {forgot.label}
          </Link>
        ) : null}
      </div>

      <SubmitButton pendingLabel={copy.pending}>{copy.submit}</SubmitButton>
    </form>
  );
}
