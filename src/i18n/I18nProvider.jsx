"use client";

import { createContext, useCallback, useContext, useMemo } from "react";
import { DEFAULT_LOCALE, getDirection } from "./config";

const I18nContext = createContext({ locale: DEFAULT_LOCALE, dir: "ltr", messages: {} });

/** Makes the active locale and its (small) dictionary available to client components. */
export function I18nProvider({ locale, messages, children }) {
  const value = useMemo(() => ({ locale, dir: getDirection(locale), messages }), [locale, messages]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useLocale() {
  return useContext(I18nContext).locale;
}

export function useDirection() {
  return useContext(I18nContext).dir;
}

/**
 * t("product.addToBag") or t("collection.pieces", { count: 3 }).
 * Missing keys return the key itself (the server dictionary already merges English fallbacks).
 */
export function useT() {
  const { messages } = useContext(I18nContext);
  return useCallback((key, vars) => interpolate(lookup(messages, key) ?? key, vars), [messages]);
}

export function lookup(messages, key) {
  return key.split(".").reduce((node, part) => (node && typeof node === "object" ? node[part] : undefined), messages);
}

export function interpolate(text, vars) {
  if (!vars || typeof text !== "string") return text;
  return text.replace(/\{(\w+)\}/g, (match, name) => (name in vars ? String(vars[name]) : match));
}
