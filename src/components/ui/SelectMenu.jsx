"use client";

import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { cn } from "@/utils/cn";
import { Icon } from "./Icon";

const GUTTER = 12; // px kept free at the viewport edges

/**
 * Accessible single-select dropdown (button + listbox) used for language and currency.
 * Keyboard: Enter/Space/↓ open; ↑/↓/Home/End move; Enter/Space choose; Esc/Tab close.
 * Closes on outside click; the panel is nudged to stay inside the viewport and
 * aligns to the logical end of its trigger (mirrors automatically in RTL).
 *
 * @param {{
 *   label: string, heading?: string, value: string,
 *   options: Array<{ value: string, label: string, hint?: string, lang?: string, dir?: string }>,
 *   onSelect: (value: string) => void, trigger: React.ReactNode, triggerLabel: string,
 *   tone?: "dark" | "light", align?: "start" | "end", footer?: React.ReactNode, className?: string,
 * }} props
 */
export function SelectMenu({ label, heading, value, options, onSelect, trigger, triggerLabel, tone = "dark", align = "end", footer, className }) {
  const id = useId();
  const rootRef = useRef(null);
  const buttonRef = useRef(null);
  const panelRef = useRef(null);
  const optionRefs = useRef([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [shift, setShift] = useState(0);
  const selectedIndex = Math.max(0, options.findIndex((option) => option.value === value));

  const close = useCallback((focusTrigger = true) => {
    setOpen(false);
    setShift(0);
    if (focusTrigger) buttonRef.current?.focus();
  }, []);

  const openMenu = (index = selectedIndex) => {
    setActive(index);
    setOpen(true);
  };

  // Outside click closes (pointerdown so it also works for touch).
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event) => !rootRef.current?.contains(event.target) && close(false);
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open, close]);

  // Keep the panel on screen (narrow phones, triggers near an edge).
  useLayoutEffect(() => {
    if (!open || !panelRef.current) return;
    const rect = panelRef.current.getBoundingClientRect();
    const overflowEnd = rect.right - (window.innerWidth - GUTTER);
    const overflowStart = GUTTER - rect.left;
    setShift(overflowEnd > 0 ? -overflowEnd : overflowStart > 0 ? overflowStart : 0);
  }, [open]);

  useEffect(() => {
    if (open) optionRefs.current[active]?.focus();
  }, [open, active]);

  const choose = (option) => {
    close();
    if (option.value !== value) onSelect(option.value);
  };

  const onTriggerKeyDown = (event) => {
    if (["ArrowDown", "Enter", " "].includes(event.key)) {
      event.preventDefault();
      openMenu();
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      openMenu(options.length - 1);
    }
  };

  const onListKeyDown = (event) => {
    const last = options.length - 1;
    const moves = { ArrowDown: Math.min(active + 1, last), ArrowUp: Math.max(active - 1, 0), Home: 0, End: last };
    if (event.key in moves) {
      event.preventDefault();
      setActive(moves[event.key]);
    } else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      choose(options[active]);
    } else if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      close();
    } else if (event.key === "Tab") {
      close(false);
    } else if (event.key.length === 1) {
      // Type-ahead on the visible label.
      const index = options.findIndex((option) => option.label.toLowerCase().startsWith(event.key.toLowerCase()));
      if (index >= 0) setActive(index);
    }
  };

  const dark = tone === "dark";

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <button
        ref={buttonRef}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? `${id}-list` : undefined}
        aria-label={triggerLabel}
        onClick={() => (open ? close() : openMenu())}
        onKeyDown={onTriggerKeyDown}
        className={cn(
          "group/trigger inline-flex h-11 items-center gap-1.5 px-2 text-sm transition-colors duration-300",
          dark ? "text-paper/80 hover:text-paper" : "text-ink hover:text-gold-deep",
          open && (dark ? "text-paper" : "text-gold-deep"),
        )}
      >
        {trigger}
        <Icon name="chevronDown" className={cn("size-3.5 opacity-60 transition-transform duration-300 ease-(--ease-luxe)", open && "rotate-180")} />
      </button>

      {open ? (
        <div
          ref={panelRef}
          style={shift ? { translate: `${shift}px 0` } : undefined}
          className={cn(
            "absolute top-full z-50 mt-2 w-60 max-w-[calc(100vw-1.5rem)] animate-[menu-in_200ms_var(--ease-luxe)_both] border shadow-[0_24px_48px_-24px_rgb(11_11_10/0.5)]",
            align === "end" ? "end-0" : "start-0",
            dark ? "border-graphite bg-ink text-paper" : "border-line bg-paper text-ink",
          )}
        >
          {heading ? <p className={cn("eyebrow border-b px-4 py-3 !text-[0.625rem]", dark ? "border-graphite text-mist" : "border-line text-mute")}>{heading}</p> : null}
          <ul id={`${id}-list`} role="listbox" aria-label={label} tabIndex={-1} onKeyDown={onListKeyDown} className="py-1.5">
            {options.map((option, index) => {
              const selected = option.value === value;
              return (
                <li
                  key={option.value}
                  ref={(node) => {
                    optionRefs.current[index] = node;
                  }}
                  role="option"
                  aria-selected={selected}
                  tabIndex={index === active ? 0 : -1}
                  lang={option.lang}
                  onClick={() => choose(option)}
                  onPointerMove={() => index !== active && setActive(index)}
                  className={cn(
                    "flex min-h-11 cursor-pointer items-center gap-3 px-4 text-sm outline-none transition-colors duration-150",
                    index === active && (dark ? "bg-ink-soft" : "bg-bone"),
                    dark ? "focus-visible:bg-ink-soft" : "focus-visible:bg-bone",
                  )}
                >
                  <span className={cn("grid size-4 shrink-0 place-items-center", dark ? "text-gold" : "text-gold-deep")} aria-hidden="true">
                    {selected ? <Icon name="check" strokeWidth={2} className="size-4" /> : null}
                  </span>
                  <span className={cn("flex-1", selected && "font-medium")}>
                    {/* bdi isolates the label's own direction without changing its alignment */}
                    <bdi dir={option.dir}>{option.label}</bdi>
                  </span>
                  {option.hint ? <span className={cn("text-xs", dark ? "text-mist" : "text-mute")}>{option.hint}</span> : null}
                </li>
              );
            })}
          </ul>
          {footer ? <div className={cn("border-t px-4 py-3 text-xs leading-relaxed", dark ? "border-graphite text-mist" : "border-line text-mute")}>{footer}</div> : null}
        </div>
      ) : null}
    </div>
  );
}
