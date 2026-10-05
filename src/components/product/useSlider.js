"use client";

import { useCallback, useRef, useState } from "react";

const SWIPE_THRESHOLD = 50; // px

/**
 * Index + swipe state for an image slider. Wraps around at both ends.
 * In RTL the visual direction flips, so a swipe/arrow toward the reading
 * direction always means "next".
 */
export function useSlider(count, { dir = "ltr" } = {}) {
  const [index, setIndex] = useState(0);
  const [dragOffset, setDragOffset] = useState(0);
  const drag = useRef(null);
  // A swipe ends with pointerup → click; this flag lets click handlers ignore that click.
  const suppressClick = useRef(false);
  const rtl = dir === "rtl";

  const goTo = useCallback((next) => setIndex(((next % count) + count) % count), [count]);
  const next = useCallback(() => goTo(index + 1), [goTo, index]);
  const prev = useCallback(() => goTo(index - 1), [goTo, index]);

  /** ArrowLeft/ArrowRight in visual terms (RTL aware). Returns true when handled. */
  const onKeyDown = useCallback(
    (event) => {
      if (count < 2) return false;
      if (event.key === "ArrowRight") (rtl ? prev : next)();
      else if (event.key === "ArrowLeft") (rtl ? next : prev)();
      else if (event.key === "Home") goTo(0);
      else if (event.key === "End") goTo(count - 1);
      else return false;
      event.preventDefault();
      return true;
    },
    [count, rtl, next, prev, goTo],
  );

  const swipeHandlers = {
    onPointerDown(event) {
      if (count < 2 || event.pointerType === "mouse") return; // mouse users have arrows/thumbnails
      drag.current = { x: event.clientX, y: event.clientY, id: event.pointerId, horizontal: null };
    },
    onPointerMove(event) {
      const state = drag.current;
      if (!state || state.id !== event.pointerId) return;
      const dx = event.clientX - state.x;
      const dy = event.clientY - state.y;
      if (state.horizontal === null && Math.abs(dx) + Math.abs(dy) > 8) {
        state.horizontal = Math.abs(dx) > Math.abs(dy);
        if (state.horizontal) event.currentTarget.setPointerCapture?.(event.pointerId);
      }
      if (state.horizontal) setDragOffset(dx);
    },
    onPointerUp(event) {
      const state = drag.current;
      drag.current = null;
      if (!state || !state.horizontal) return setDragOffset(0);
      const dx = event.clientX - state.x;
      setDragOffset(0);
      suppressClick.current = true;
      if (Math.abs(dx) < SWIPE_THRESHOLD) return;
      // Swiping left reveals the next image in LTR; in RTL it reveals the previous one.
      if (dx < 0) (rtl ? prev : next)();
      else (rtl ? next : prev)();
    },
    onPointerCancel() {
      drag.current = null;
      setDragOffset(0);
    },
  };

  /** Call at the start of click handlers inside the swipe area; true means "ignore this click". */
  const consumeSwipeClick = useCallback(() => {
    const swiped = suppressClick.current;
    suppressClick.current = false;
    return swiped;
  }, []);

  return { index, goTo, next, prev, onKeyDown, swipeHandlers, consumeSwipeClick, dragOffset, dragging: dragOffset !== 0 };
}

/** Transform for a horizontal track showing slide `index` (RTL tracks run right-to-left). */
export function trackTransform(index, dragOffset, dir) {
  const sign = dir === "rtl" ? 1 : -1;
  return `translate3d(calc(${sign * index * 100}% + ${dragOffset}px), 0, 0)`;
}
