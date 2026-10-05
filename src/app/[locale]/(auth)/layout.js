import Image from "next/image";
import { Suspense } from "react";
import { LanguageMenu } from "@/components/layout/LanguageMenu";
import { Icon } from "@/components/ui/Icon";
import { Logo } from "@/components/ui/Logo";
import { siteConfig } from "@/config/site";
import Link from "@/i18n/Link";
import { getTranslator } from "@/i18n/server";

export default async function AuthLayout({ children, params }) {
  const t = await getTranslator((await params).locale);

  return (
    <div className="grid min-h-dvh lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      {/* Brand panel — desktop only, so mobile goes straight to the form. */}
      <aside className="relative hidden overflow-hidden bg-ink text-paper lg:block">
        <Image src="/images/storefront/lookbook-2.jpg" alt="" fill preload sizes="50vw" className="object-cover opacity-55" />
        <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-ink via-ink/40 to-ink/30" />
        <div className="relative flex h-full flex-col justify-between p-14">
          <Logo variant="full" className="h-32" />
          <div className="flex max-w-md flex-col gap-5">
            <span className="rule-gold" aria-hidden="true" />
            <p className="headline text-display italic">{t("brand.tagline")}</p>
            <p className="eyebrow text-paper/60">{siteConfig.name}</p>
          </div>
        </div>
      </aside>

      <main id="main" className="flex flex-col">
        <div className="container-page flex h-16 items-center justify-between gap-4 border-b border-line lg:h-20 lg:border-0">
          <Link href="/" className="inline-flex min-h-11 items-center gap-2 text-xs text-subtle transition-colors hover:text-ink">
            <Icon name="arrowRight" className="size-4 -scale-x-100 rtl:scale-x-100" />
            <span className="eyebrow !text-[0.625rem]">{siteConfig.name}</span>
          </Link>
          <div className="lg:hidden">
            <Logo className="h-9" />
          </div>
          <Suspense fallback={null}>
            <LanguageMenu tone="light" />
          </Suspense>
        </div>
        <div className="flex flex-1 items-center py-12">
          <div className="container-narrow max-w-md animate-reveal">{children}</div>
        </div>
      </main>
    </div>
  );
}
