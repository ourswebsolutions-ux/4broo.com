"use client";

import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { Spinner } from "@/components/ui/Spinner";
import { useLocale, useT } from "@/i18n/I18nProvider";
import { localizeHref } from "@/i18n/navigation";
import { cn } from "@/utils/cn";
import { useRecentSearches } from "./useRecentSearches";

const DEBOUNCE_MS = 220;

/**
 * Search combobox with live suggestions (categories + products) from the database.
 * ↑/↓ moves through suggestions, Enter opens one (or searches), Esc closes.
 * Works without JavaScript as a plain GET form.
 */
export function SearchField({ defaultValue = "", autoFocus = false, onNavigate, className }) {
  const t = useT();
  const locale = useLocale();
  const router = useRouter();
  const listId = useId();
  const inputRef = useRef(null);
  const recent = useRecentSearches();
  const [value, setValue] = useState(defaultValue);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [state, setState] = useState({ status: "idle", categories: [], products: [] });
  const trimmed = value.trim();

  useEffect(() => {
    if (trimmed.length < 2) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setState((previous) => ({ ...previous, status: "loading" }));
      try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(trimmed)}&limit=5&locale=${locale}`, { signal: controller.signal });
        const payload = await response.json();
        if (!payload.ok) throw new Error();
        setState({ status: "done", categories: payload.data.categories ?? [], products: payload.data.results });
      } catch (error) {
        if (error.name !== "AbortError") setState({ status: "error", categories: [], products: [] });
      }
    }, DEBOUNCE_MS);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [trimmed, locale]);

  const suggestions =
    trimmed.length >= 2
      ? [
          ...state.categories.map((category) => ({ key: `c-${category.slug}`, type: "category", label: category.name, meta: category.parent, href: `/collections/${category.slug}` })),
          ...state.products.map((product) => ({ key: `p-${product.id}`, type: "product", label: product.name, meta: product.category?.name, href: product.href })),
        ]
      : recent.items.map((term) => ({ key: `r-${term}`, type: "recent", label: term, href: `/search?q=${encodeURIComponent(term)}` }));

  const go = (href) => {
    setOpen(false);
    onNavigate?.();
    router.push(localizeHref(href, locale));
  };

  const submit = (event) => {
    event.preventDefault();
    if (active >= 0 && suggestions[active]) return go(suggestions[active].href);
    if (!trimmed) return;
    recent.add(trimmed);
    go(`/search?q=${encodeURIComponent(trimmed)}`);
  };

  const onKeyDown = (event) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setOpen(true);
      setActive((index) => Math.min(index + 1, suggestions.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((index) => Math.max(index - 1, -1));
    } else if (event.key === "Escape" && open) {
      event.stopPropagation();
      setOpen(false);
      setActive(-1);
    }
  };

  const showList = open && (suggestions.length > 0 || (trimmed.length >= 2 && state.status !== "idle"));

  return (
    <form role="search" action={localizeHref("/search", locale)} onSubmit={submit} className={cn("relative w-full max-w-2xl", className)}>
      <div className="flex items-center gap-3 border-b border-ink pb-2 transition-colors focus-within:border-gold-deep">
        <Icon name="search" className="size-5 shrink-0 text-mute" />
        <label htmlFor={`${listId}-input`} className="sr-only">
          {t("search.label")}
        </label>
        <input
          ref={inputRef}
          id={`${listId}-input`}
          name="q"
          type="search"
          role="combobox"
          aria-expanded={showList}
          aria-controls={`${listId}-list`}
          aria-autocomplete="list"
          aria-activedescendant={active >= 0 ? `${listId}-opt-${active}` : undefined}
          autoComplete="off"
          enterKeyHint="search"
          autoFocus={autoFocus}
          maxLength={80}
          value={value}
          placeholder={t("search.placeholder")}
          onChange={(event) => {
            setValue(event.target.value);
            setOpen(true);
            setActive(-1);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          onKeyDown={onKeyDown}
          className="h-12 w-full min-w-0 bg-transparent font-display text-2xl font-light outline-none placeholder:text-mute/70 sm:text-3xl [&::-webkit-search-cancel-button]:hidden"
        />
        {state.status === "loading" && trimmed.length >= 2 ? <Spinner label={t("common.loading")} className="text-mute" /> : null}
        {value ? (
          <button
            type="button"
            onClick={() => {
              setValue("");
              setActive(-1);
              inputRef.current?.focus();
            }}
            className="eyebrow shrink-0 px-2 py-3 text-mute hover:text-ink"
          >
            {t("search.clear")}
          </button>
        ) : null}
      </div>

      {showList ? (
        <ul id={`${listId}-list`} role="listbox" className="absolute inset-x-0 top-full z-30 mt-2 max-h-[60vh] animate-[fade_200ms_ease-out] overflow-y-auto border border-line bg-paper py-2 shadow-[0_18px_40px_-20px_rgb(11_11_10/0.35)]">
          {suggestions.length === 0 ? (
            <li className="px-4 py-3 text-sm text-mute">{state.status === "error" ? t("search.unavailable") : state.status === "loading" ? t("common.loading") : t("search.noResults", { query: trimmed })}</li>
          ) : (
            suggestions.map((item, index) => (
              <li
                key={item.key}
                id={`${listId}-opt-${index}`}
                role="option"
                aria-selected={index === active}
                onMouseDown={(event) => {
                  event.preventDefault();
                  if (item.type === "recent") recent.add(item.label);
                  go(item.href);
                }}
                onMouseEnter={() => setActive(index)}
                className={cn("flex cursor-pointer items-center gap-3 px-4 py-2.5 text-sm", index === active && "bg-bone")}
              >
                <Icon name={item.type === "category" ? "menu" : item.type === "recent" ? "clock" : "search"} className="size-4 shrink-0 text-mute" />
                <span className="flex-1 truncate">{item.label}</span>
                {item.meta ? <span className="truncate text-xs text-mute">{item.meta}</span> : null}
                <span className="eyebrow !text-[0.5625rem] text-gold-deep">{item.type === "category" ? t("search.categories") : item.type === "product" ? t("search.products") : ""}</span>
              </li>
            ))
          )}
        </ul>
      ) : null}
    </form>
  );
}
