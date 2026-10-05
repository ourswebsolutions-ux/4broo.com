"use client";

import { Button } from "@/components/ui/Button";
import { Logo } from "@/components/ui/Logo";
import { departments } from "@/config/navigation";
import { useT } from "@/i18n/I18nProvider";

/** Branded 404 in the visitor's language (rendered inside the locale layout). */
export function NotFoundContent({ embedded = false }) {
  const t = useT();
  const Wrapper = embedded ? "section" : "main";
  return (
    <Wrapper {...(!embedded && { id: "main" })} className={embedded ? "flex flex-1 flex-col bg-ink text-paper" : "flex min-h-dvh flex-col bg-ink text-paper"}>
      {embedded ? null : (
        <div className="container-page flex h-16 items-center lg:h-20">
          <Logo className="h-10 lg:h-12" />
        </div>
      )}
      <div className="container-page flex flex-1 flex-col justify-center gap-8 py-20 sm:py-28">
        <p className="eyebrow flex items-center gap-3 text-gold">
          <span className="rule-gold" aria-hidden="true" />
          {t("system.notFoundEyebrow")}
        </p>
        <h1 className="headline max-w-3xl text-display">{t("system.notFoundTitle")}</h1>
        <p className="max-w-md text-[0.9375rem] leading-relaxed text-mist">{t("system.notFoundText")}</p>
        <div className="flex flex-wrap gap-3">
          <Button href="/" variant="gold" arrow>
            {t("system.returnHome")}
          </Button>
          {departments.map((item) => (
            <Button key={item.href} href={item.href} variant="outline-light">
              {t(item.labelKey)}
            </Button>
          ))}
        </div>
      </div>
    </Wrapper>
  );
}
