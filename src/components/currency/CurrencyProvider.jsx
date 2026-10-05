"use client";

import { createContext, useCallback, useContext, useMemo, useSyncExternalStore } from "react";
import { BASE_CURRENCY, CURRENCY_COOKIE } from "@/config/currency";

const STORAGE_KEY = "4bro:currency";
const listeners = new Set();
const CurrencyContext = createContext({ currency: BASE_CURRENCY, available: [BASE_CURRENCY], usdRate: null, setCurrency: () => {} });

function read() {
  try {
    return window.localStorage.getItem(STORAGE_KEY) ?? BASE_CURRENCY;
  } catch {
    return BASE_CURRENCY;
  }
}

function subscribe(listener) {
  listeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

/**
 * Display-currency preference (PKR canonical; USD only when the server has a rate).
 * Stored per browser; server renders always use PKR, so pages stay cacheable.
 */
export function CurrencyProvider({ available, usdRate, children }) {
  const stored = useSyncExternalStore(subscribe, read, () => BASE_CURRENCY);
  const currency = available.includes(stored) ? stored : BASE_CURRENCY;

  const setCurrency = useCallback((next) => {
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
      document.cookie = `${CURRENCY_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
    } catch {
      /* storage unavailable — preference lasts for this page only */
    }
    listeners.forEach((listener) => listener());
  }, []);

  const value = useMemo(() => ({ currency, available, usdRate, setCurrency }), [currency, available, usdRate, setCurrency]);
  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>;
}

export const useCurrency = () => useContext(CurrencyContext);
