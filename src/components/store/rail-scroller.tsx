"use client";

import { useEffect, useRef } from "react";

/** Pointer travel (px) before a press becomes a drag instead of a click. */
const DRAG_THRESHOLD = 5;
/** One card per wheel "step"; trackpads fire many small events, so steps are throttled. */
const WHEEL_STEP_MS = 350;

/**
 * The homepage product rails' scroll container (a <ul>), adding to native
 * touch swiping and trackpad side-scrolling, at every screen size:
 * - Mouse drag: press and drag to move the row; release settles on the
 *   nearest card. A drag never counts as a click on the card under it.
 * - Mouse wheel: while hovering, wheel down = next card, up = previous card.
 *   At either end of the row the wheel is left alone so the page keeps
 *   scrolling instead of getting trapped.
 */
export function RailScroller({ className, children }: { className: string; children: React.ReactNode }) {
  const ref = useRef<HTMLUListElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const leftPadding = () => parseFloat(getComputedStyle(el).scrollPaddingLeft) || 0;
    /** scrollLeft that puts `item` at the row's start (respecting scroll-padding). */
    const itemOffset = (item: Element) =>
      el.scrollLeft + item.getBoundingClientRect().left - el.getBoundingClientRect().left - leftPadding();
    const nearestIndex = () => {
      const items = [...el.children];
      let best = 0;
      let bestDistance = Number.POSITIVE_INFINITY;
      items.forEach((item, index) => {
        const distance = Math.abs(itemOffset(item) - el.scrollLeft);
        if (distance < bestDistance) {
          bestDistance = distance;
          best = index;
        }
      });
      return best;
    };
    const scrollToIndex = (index: number) => {
      const items = el.children;
      const clamped = Math.max(0, Math.min(items.length - 1, index));
      const item = items[clamped];
      if (item) el.scrollTo({ left: itemOffset(item), behavior: "smooth" });
    };

    // --- Mouse drag -------------------------------------------------------
    let pressed = false;
    let dragging = false;
    let suppressClick = false;
    let startX = 0;
    let startLeft = 0;
    let pointerId = -1;

    const onPointerDown = (event: PointerEvent) => {
      if (event.pointerType !== "mouse" || event.button !== 0) return;
      pressed = true;
      dragging = false;
      startX = event.clientX;
      startLeft = el.scrollLeft;
      pointerId = event.pointerId;
    };
    const onPointerMove = (event: PointerEvent) => {
      if (!pressed) return;
      const dx = event.clientX - startX;
      if (!dragging) {
        if (Math.abs(dx) < DRAG_THRESHOLD) return;
        dragging = true;
        try {
          el.setPointerCapture(pointerId);
        } catch {
          // Pointer already gone (e.g. released outside the window); the
          // drag still works while the pointer stays over the row.
        }
        // Snap fights a hand-driven scroll; it comes back on release.
        el.style.scrollSnapType = "none";
        el.style.cursor = "grabbing";
        el.style.userSelect = "none";
      }
      el.scrollLeft = startLeft - dx;
    };
    const endDrag = () => {
      if (!pressed) return;
      pressed = false;
      if (!dragging) return;
      dragging = false;
      suppressClick = true;
      if (el.hasPointerCapture(pointerId)) el.releasePointerCapture(pointerId);
      el.style.cursor = "";
      el.style.userSelect = "";
      const index = nearestIndex();
      el.style.scrollSnapType = "";
      scrollToIndex(index);
    };
    // Capture phase, so the card link under the pointer never sees the
    // click that ends a drag.
    const onClickCapture = (event: MouseEvent) => {
      if (!suppressClick) return;
      suppressClick = false;
      event.preventDefault();
      event.stopPropagation();
    };
    // Images and links are natively draggable, which would hijack the drag.
    const onDragStart = (event: DragEvent) => event.preventDefault();

    // --- Mouse wheel ------------------------------------------------------
    let wheelLockedUntil = 0;
    const onWheel = (event: WheelEvent) => {
      // A sideways trackpad swipe already scrolls the row natively.
      if (Math.abs(event.deltaX) >= Math.abs(event.deltaY)) return;
      const direction = Math.sign(event.deltaY);
      if (direction === 0) return;
      const max = el.scrollWidth - el.clientWidth;
      const atStart = el.scrollLeft <= 1;
      const atEnd = el.scrollLeft >= max - 1;
      if ((direction < 0 && atStart) || (direction > 0 && atEnd)) return; // let the page scroll
      event.preventDefault();
      const now = performance.now();
      if (now < wheelLockedUntil) return;
      wheelLockedUntil = now + WHEEL_STEP_MS;
      scrollToIndex(nearestIndex() + direction);
    };

    el.addEventListener("pointerdown", onPointerDown);
    el.addEventListener("pointermove", onPointerMove);
    el.addEventListener("pointerup", endDrag);
    el.addEventListener("pointercancel", endDrag);
    el.addEventListener("click", onClickCapture, true);
    el.addEventListener("dragstart", onDragStart);
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      el.removeEventListener("pointerdown", onPointerDown);
      el.removeEventListener("pointermove", onPointerMove);
      el.removeEventListener("pointerup", endDrag);
      el.removeEventListener("pointercancel", endDrag);
      el.removeEventListener("click", onClickCapture, true);
      el.removeEventListener("dragstart", onDragStart);
      el.removeEventListener("wheel", onWheel);
    };
  }, []);

  return (
    <ul ref={ref} className={className}>
      {children}
    </ul>
  );
}
