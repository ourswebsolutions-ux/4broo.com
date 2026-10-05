"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import { SelectMenu } from "@/components/ui/SelectMenu";
import { useLocale, useT } from "@/i18n/I18nProvider";
import { LOCALE_COOKIE, LOCALES, SUPPORTED_LOCALES } from "@/i18n/config";
import { switchLocalePath } from "@/i18n/navigation";
import { cn } from "@/utils/cn";

const SHORT = { en: "EN", ur: "اردو", hi: "हिन्दी" };

/**
 * Language dropdown (English · اردو · हिन्दी). Switches to the same page in the
 * chosen language (query kept) and remembers the choice in a cookie, which the
 * proxy uses to send returning visitors to their language.
 */
export function LanguageMenu({ tone = "dark", align = "end", compact = false, className }) {
  const t = useT();
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const query = useSearchParams().toString();

  const select = (code) => {
    document.cookie = `${LOCALE_COOKIE}=${code}; path=/; max-age=31536000; samesite=lax`;
    router.push(`${switchLocalePath(pathname, code)}${query ? `?${query}` : ""}`);
  };

  return (
    <SelectMenu
      label={t("header.language")}
      heading={t("header.language")}
      value={locale}
      tone={tone}
      align={align}
      className={className}
      triggerLabel={t("header.changeLanguage", { name: LOCALES[locale].nativeLabel })}
      trigger={
        <>
          <Icon name="globe" className="size-4.5" />
          <span lang={LOCALES[locale].htmlLang} className={cn(locale === "en" ? "eyebrow !text-[0.6875rem]" : "text-[0.8125rem]", compact && "max-sm:sr-only")}>
            {SHORT[locale]}
          </span>
        </>
      }
      options={SUPPORTED_LOCALES.map((code) => ({
        value: code,
        label: LOCALES[code].nativeLabel,
        hint: code === "en" ? null : LOCALES[code].label,
        lang: LOCALES[code].htmlLang,
        dir: LOCALES[code].dir,
      }))}
      onSelect={select}
    />
  );
}
