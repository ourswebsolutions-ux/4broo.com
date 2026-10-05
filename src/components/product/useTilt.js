"use client";

const MAX_DEG = 2.5;
const QUERY = "(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)";

const setTilt = (el, x, y, lift) => {
  el.style.setProperty("--tilt-x", `${x}deg`);
  el.style.setProperty("--tilt-y", `${y}deg`);
  el.style.setProperty("--tilt-lift", `${lift}px`);
};

/**
 * Very subtle perspective response for product imagery (max ±2.5°). Mouse / fine
 * pointers only, never with reduced motion. Spread onto an element with `.tilt`.
 */
export const tiltHandlers = {
  onPointerMove(event) {
    if (event.pointerType !== "mouse" || !window.matchMedia(QUERY).matches) return;
    const el = event.currentTarget;
    const rect = el.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width - 0.5;
    const y = (event.clientY - rect.top) / rect.height - 0.5;
    el.dataset.tilting = "true";
    setTilt(el, (-y * MAX_DEG).toFixed(2), (x * MAX_DEG).toFixed(2), -4);
  },
  onPointerLeave(event) {
    const el = event.currentTarget;
    el.dataset.tilting = "false";
    setTilt(el, 0, 0, 0);
  },
};
