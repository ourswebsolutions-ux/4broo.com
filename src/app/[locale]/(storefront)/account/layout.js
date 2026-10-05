import { AccountNav, SignOutButton } from "@/components/account/AccountNav";
import { getTranslator } from "@/i18n/server";
import { requireCustomer } from "@/lib/auth/guards";

export async function generateMetadata({ params }) {
  const t = await getTranslator((await params).locale);
  return { title: t("account.title"), robots: { index: false } };
}

// Server-side gate for everything under /account (the proxy check is only optimistic).
export default async function AccountLayout({ children, params }) {
  const { locale } = await params;
  const [user, t] = await Promise.all([requireCustomer({ redirectTo: "/account", locale }), getTranslator(locale)]);

  return (
    <div className="container-page pb-24 pt-10 sm:pt-14">
      <header className="flex items-end justify-between gap-6 pb-8 lg:pb-12">
        <div className="flex flex-col gap-3">
          <p className="eyebrow flex items-center gap-3 text-gold-deep">
            <span className="rule-gold" aria-hidden="true" />
            {t("account.title")}
          </p>
          <p className="headline text-display-sm">{t("account.welcome", { name: user.firstName })}</p>
        </div>
        <SignOutButton className="shrink-0 lg:hidden" />
      </header>
      {/* minmax(0,1fr): the scrollable tab row must not widen the mobile column */}
      <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-10 lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-16">
        <AccountNav />
        <div className="min-w-0 animate-[fade_450ms_ease-out_both]">{children}</div>
      </div>
    </div>
  );
}
