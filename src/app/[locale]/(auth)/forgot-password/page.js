import { ForgotPasswordForm } from "@/components/auth/PasswordResetForms";
import Link from "@/i18n/Link";
import { getTranslator } from "@/i18n/server";

export async function generateMetadata({ params }) {
  const t = await getTranslator((await params).locale);
  return { title: t("auth.forgotTitle"), robots: { index: false } };
}

export default async function ForgotPasswordPage({ params }) {
  const t = await getTranslator((await params).locale);
  return (
    <div className="flex flex-col gap-10">
      <header className="flex flex-col gap-3">
        <p className="eyebrow text-gold-deep">{t("auth.forgotPassword")}</p>
        <h1 className="headline text-display-sm">{t("auth.forgotTitle")}</h1>
        <p className="text-sm leading-relaxed text-subtle">{t("auth.forgotIntro")}</p>
      </header>
      <ForgotPasswordForm />
      <p className="border-t border-line pt-8 text-sm">
        <Link href="/login" className="text-subtle underline underline-offset-4 hover:text-ink">
          {t("auth.backToSignIn")}
        </Link>
      </p>
    </div>
  );
}
