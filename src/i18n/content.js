// Localised catalogue content: overlays a translation row (ProductTranslation /
// CategoryTranslation) onto the base English record, field by field.
import { DEFAULT_LOCALE } from "./config.js";

/**
 * @param {object} record  Prisma record including `translations` (filtered to the locale or all).
 * @param {string} locale
 * @param {string[]} fields Translatable fields, e.g. ["name", "shortDescription", "description"].
 */
export function localize(record, locale, fields) {
  if (!record || locale === DEFAULT_LOCALE || !record.translations?.length) return record;
  const translation = record.translations.find((row) => row.locale === locale);
  if (!translation) return record;

  const overlay = Object.fromEntries(fields.filter((field) => translation[field]).map((field) => [field, translation[field]]));
  return { ...record, ...overlay };
}

/** Prisma `include` fragment that loads only the needed translation row. */
export const translationsFor = (locale) =>
  locale === DEFAULT_LOCALE ? undefined : { where: { locale }, take: 1 };
