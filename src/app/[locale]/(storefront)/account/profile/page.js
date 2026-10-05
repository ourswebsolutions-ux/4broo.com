import { PasswordForm, ProfileForm } from "@/components/account/ProfileForms";
import { getTranslator } from "@/i18n/server";
import { requireCustomer } from "@/lib/auth/guards";
import { getDb } from "@/lib/db";

export default async function ProfilePage({ params }) {
  const { locale } = await params;
  const [user, t] = await Promise.all([requireCustomer({ redirectTo: "/account/profile", locale }), getTranslator(locale)]);
  const profile = await getDb().user.findUnique({ where: { id: user.id }, select: { firstName: true, lastName: true, email: true, phone: true } });

  return (
    <div className="flex flex-col gap-16">
      <section aria-labelledby="profile-title" className="flex max-w-2xl flex-col gap-8">
        <div className="flex flex-col gap-2 border-b border-ink pb-4">
          <h1 id="profile-title" className="headline text-title">
            {t("account.profile")}
          </h1>
          <p className="text-sm text-subtle">{t("account.profileIntro")}</p>
        </div>
        <ProfileForm profile={profile} />
      </section>
      <section aria-labelledby="security-title" className="flex max-w-2xl flex-col gap-8">
        <h2 id="security-title" className="headline border-b border-ink pb-4 text-title">
          {t("account.security")}
        </h2>
        <PasswordForm />
      </section>
    </div>
  );
}
