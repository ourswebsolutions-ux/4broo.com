"use client";

import { useCallback, useSyncExternalStore } from "react";

const KEY = "4bro:recent-searches";
const MAX = 6;
const listeners = new Set();
const EMPTY = [];
let cache = null;

function read() {
  if (cache) return cache;
  try {
    const parsed = JSON.parse(window.localStorage.getItem(KEY) ?? "[]");
    cache = Array.isArray(parsed) ? parsed.filter((item) => typeof item === "string").slice(0, MAX) : EMPTY;
  } catch {
    cache = EMPTY; // storage unavailable (private mode, blocked) — degrade gracefully
  }
  return cache;
}

function write(items) {
  cache = items;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(items));
  } catch {
    // ignore — recent searches are a convenience only
  }
  listeners.forEach((listener) => listener());
}

function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Per-browser recent search terms (localStorage). Never sent to the server. */
export function useRecentSearches() {
  const items = useSyncExternalStore(subscribe, read, () => EMPTY);

  const add = useCallback((term) => {
    const value = term.trim().slice(0, 80);
    if (!value) return;
    write([value, ...read().filter((item) => item.toLowerCase() !== value.toLowerCase())].slice(0, MAX));
  }, []);

  const clear = useCallback(() => write(EMPTY), []);

  return { items, add, clear };
}
