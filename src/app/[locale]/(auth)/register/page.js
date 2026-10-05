import { redirect } from "next/navigation";
import { RegisterForm } from "@/components/auth/RegisterForm";
import { routes } from "@/config/site";
import Link from "@/i18n/Link";
import { localizeHref } from "@/i18n/navigation";
import { getTranslator } from "@/i18n/server";
import { getCurrentUser } from "@/lib/auth/session";
import { PASSWORD_MIN_LENGTH } from "@/lib/validation/schemas/auth";
import { safeRedirectSchema } from "@/lib/validation/schemas/common";

export async function generateMetadata({ params }) {
  const t = await getTranslator((await params).locale);
  return { title: t("auth.createTitle"), robots: { index: false } };
}

export default async function RegisterPage({ searchParams, params }) {
  const [{ next }, { locale }] = await Promise.all([searchParams, params]);
  const t = await getTranslator(locale);
  const redirectTo = safeRedirectSchema.parse(typeof next === "string" ? next : undefined);

  if (await getCurrentUser()) redirect(redirectTo ?? localizeHref(routes.account, locale));
  const carry = redirectTo ? `?next=${encodeURIComponent(redirectTo)}` : "";

  return (
    <div className="flex flex-col gap-10">
      <header className="flex flex-col gap-3">
        <p className="eyebrow text-gold-deep">{t("auth.join")}</p>
        <h1 className="headline text-display-sm">{t("auth.createTitle")}</h1>
        <p className="text-sm leading-relaxed text-subtle">{t("auth.benefits")}</p>
      </header>

      <RegisterForm redirectTo={redirectTo} passwordMinLength={PASSWORD_MIN_LENGTH} />

      <p className="border-t border-line pt-8 text-sm text-subtle">
        {t("auth.haveAccount")}{" "}
        <Link href={`${routes.login}${carry}`} className="text-ink underline underline-offset-4">
          {t("auth.signIn")}
        </Link>
      </p>
    </div>
  );
}
