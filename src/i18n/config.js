// Locale configuration (public; safe on server and client).
//
// Architecture:
// - UI strings → JSON dictionaries in src/i18n/dictionaries (never in the database).
// - Catalogue content (product/category names & descriptions) → base English
//   fields on the model + optional rows in ProductTranslation / CategoryTranslation.
// - Direction: Urdu is right-to-left; <html dir> must follow getDirection(locale).
// Routing strategy (planned for the storefront phase): locale-prefixed URLs for
// non-default locales (/ur/…, /hi/…) so pages stay statically renderable and
// each language gets its own canonical URL + hreflang.

export const LOCALES = {
  en: { code: "en", label: "English", nativeLabel: "English", dir: "ltr", htmlLang: "en", numberingLocale: "en-PK" },
  ur: { code: "ur", label: "Urdu", nativeLabel: "اردو", dir: "rtl", htmlLang: "ur-PK", numberingLocale: "ur-PK" },
  hi: { code: "hi", label: "Hindi", nativeLabel: "हिन्दी", dir: "ltr", htmlLang: "hi-IN", numberingLocale: "hi-IN" },
};

export const DEFAULT_LOCALE = "en";
export const SUPPORTED_LOCALES = Object.keys(LOCALES);
/** Locales that need DB translation rows (the default locale uses the base fields). */
export const TRANSLATED_LOCALES = SUPPORTED_LOCALES.filter((code) => code !== DEFAULT_LOCALE);
export const LOCALE_COOKIE = "4bro_locale";

export const isSupportedLocale = (code) => SUPPORTED_LOCALES.includes(code);
export const getDirection = (locale) => LOCALES[locale]?.dir ?? "ltr";
export const isRtl = (locale) => getDirection(locale) === "rtl";

/**
 * Choose a locale from (in priority order) an explicit value (URL segment),
 * a saved cookie, then the Accept-Language header. Pure function — no I/O.
 */
export function resolveLocale({ explicit, cookie, acceptLanguage } = {}) {
  if (isSupportedLocale(explicit)) return explicit;
  if (isSupportedLocale(cookie)) return cookie;

  const preferred = String(acceptLanguage ?? "")
    .split(",")
    .map((part) => {
      const [tag, q = "q=1"] = part.trim().split(";");
      return { code: tag.toLowerCase().split("-")[0], weight: Number(q.replace("q=", "")) || 0 };
    })
    .sort((a, b) => b.weight - a.weight)
    .find((entry) => isSupportedLocale(entry.code));

  return preferred?.code ?? DEFAULT_LOCALE;
}
