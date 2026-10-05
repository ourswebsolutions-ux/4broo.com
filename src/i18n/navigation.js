// Locale-aware URLs. English (default) URLs are unprefixed; others get /ur, /hi.
// Pure functions — safe on server, client and in the proxy.
import { DEFAULT_LOCALE, SUPPORTED_LOCALES } from "./config.js";

const PREFIXED = SUPPORTED_LOCALES.filter((code) => code !== DEFAULT_LOCALE);

/** Split "/ur/collections/men" → { locale: "ur", path: "/collections/men" }. */
export function splitLocale(pathname = "/") {
  const [, first] = pathname.split("/");
  if (PREFIXED.includes(first)) {
    return { locale: first, path: pathname.slice(first.length + 1) || "/" };
  }
  return { locale: DEFAULT_LOCALE, path: pathname || "/" };
}

/** Prefix an internal href for a locale. External, hash, mailto and admin/api links are untouched. */
export function localizeHref(href, locale = DEFAULT_LOCALE) {
  if (typeof href !== "string" || !href.startsWith("/") || href.startsWith("//")) return href;
  if (/^\/(admin|api)(\/|$|\?)/.test(href)) return href;
  if (locale === DEFAULT_LOCALE || !PREFIXED.includes(locale)) return href;
  if (splitLocale(href).locale !== DEFAULT_LOCALE) return href; // already prefixed
  return href === "/" ? `/${locale}` : `/${locale}${href}`;
}

/** The same page in another locale (used by the language switcher). */
export function switchLocalePath(pathname, targetLocale) {
  return localizeHref(splitLocale(pathname).path, targetLocale);
}
