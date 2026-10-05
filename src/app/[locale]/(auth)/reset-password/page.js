import { ResetPasswordForm } from "@/components/auth/PasswordResetForms";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { getTranslator } from "@/i18n/server";
import { findResetToken } from "@/lib/auth/passwordReset";

export async function generateMetadata({ params }) {
  const t = await getTranslator((await params).locale);
  return { title: t("auth.resetTitle"), robots: { index: false }, referrer: "no-referrer" };
}

export default async function ResetPasswordPage({ params, searchParams }) {
  const [{ locale }, { token }] = await Promise.all([params, searchParams]);
  const t = await getTranslator(locale);
  const valid = typeof token === "string" && Boolean(await findResetToken(token));

  return (
    <div className="flex flex-col gap-10">
      <header className="flex flex-col gap-3">
        <p className="eyebrow text-gold-deep">4 BRO</p>
        <h1 className="headline text-display-sm">{t("auth.resetTitle")}</h1>
        {valid ? <p className="text-sm leading-relaxed text-subtle">{t("auth.resetIntro")}</p> : null}
      </header>
      {valid ? (
        <ResetPasswordForm token={token} />
      ) : (
        <div className="flex flex-col gap-7">
          <Alert tone="error">{t("auth.resetInvalid")}</Alert>
          <Button href="/forgot-password" fullWidth>
            {t("auth.requestNew")}
          </Button>
        </div>
      )}
    </div>
  );
}
