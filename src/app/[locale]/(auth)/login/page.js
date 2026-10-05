import { redirect } from "next/navigation";
import { loginAction } from "@/actions/auth";
import { LoginForm } from "@/components/auth/LoginForm";
import { routes } from "@/config/site";
import Link from "@/i18n/Link";
import { localizeHref } from "@/i18n/navigation";
import { getTranslator } from "@/i18n/server";
import { getCurrentUser } from "@/lib/auth/session";
import { safeRedirectSchema } from "@/lib/validation/schemas/common";

export async function generateMetadata({ params }) {
  const t = await getTranslator((await params).locale);
  return { title: t("auth.signIn"), robots: { index: false } };
}

export default async function LoginPage({ searchParams, params }) {
  const [{ next, reset }, { locale }] = await Promise.all([searchParams, params]);
  const t = await getTranslator(locale);
  const redirectTo = safeRedirectSchema.parse(typeof next === "string" ? next : undefined);

  if (await getCurrentUser()) redirect(redirectTo ?? localizeHref(routes.account, locale));
  const carry = redirectTo ? `?next=${encodeURIComponent(redirectTo)}` : "";

  return (
    <div className="flex flex-col gap-10">
      <header className="flex flex-col gap-3">
        <p className="eyebrow text-gold-deep">{t("auth.welcomeBack")}</p>
        <h1 className="headline text-display-sm">{t("auth.signIn")}</h1>
        <p className="text-sm leading-relaxed text-subtle">{t("auth.benefits")}</p>
      </header>

      <LoginForm
        action={loginAction}
        redirectTo={redirectTo}
        locale={locale}
        copy={{ email: t("auth.email"), password: t("auth.password"), submit: t("auth.signIn"), pending: t("auth.signingIn") }}
        forgot={{ href: "/forgot-password", label: t("auth.forgotPassword") }}
        notice={reset ? t("auth.resetDone") : null}
      />

      <p className="border-t border-line pt-8 text-sm text-subtle">
        {t("auth.newHere")}{" "}
        <Link href={`${routes.register}${carry}`} className="text-ink underline underline-offset-4">
          {t("auth.createAccount")}
        </Link>
      </p>
    </div>
  );
}
