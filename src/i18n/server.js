// Server-side translation helpers. Dictionaries load lazily per locale, so only
// the requested language ships with a render.
import "server-only";
import { DEFAULT_LOCALE, isSupportedLocale } from "./config.js";

const loaders = {
  en: () => import("./dictionaries/en.json", { with: { type: "json" } }),
  ur: () => import("./dictionaries/ur.json", { with: { type: "json" } }),
  hi: () => import("./dictionaries/hi.json", { with: { type: "json" } }),
};

async function loadRaw(locale) {
  const code = isSupportedLocale(locale) ? locale : DEFAULT_LOCALE;
  return (await loaders[code]()).default;
}

function deepMerge(base, override) {
  const out = { ...base };
  for (const [key, value] of Object.entries(override ?? {})) {
    out[key] = value && typeof value === "object" && !Array.isArray(value) ? deepMerge(base?.[key] ?? {}, value) : value;
  }
  return out;
}

/** Locale dictionary with English filled in for any missing key (what the client receives). */
export async function getDictionary(locale) {
  const english = await loadRaw(DEFAULT_LOCALE);
  return locale === DEFAULT_LOCALE ? english : deepMerge(english, await loadRaw(locale));
}

function lookup(dictionary, key) {
  return key.split(".").reduce((node, part) => (node && typeof node === "object" ? node[part] : undefined), dictionary);
}

/**
 * Returns t("nav.men") for a locale. Missing keys fall back to English, then to
 * the key itself — so an incomplete translation never breaks a page.
 */
export async function getTranslator(locale) {
  const dictionary = await getDictionary(locale);
  return (key, vars) => {
    const text = lookup(dictionary, key) ?? key;
    return vars ? text.replace(/\{(\w+)\}/g, (match, name) => (name in vars ? String(vars[name]) : match)) : text;
  };
}
