"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * A homepage product rail: the horizontally scrolling <ul> plus Previous /
 * Next arrow buttons over its left and right edges from md up (phones
 * swipe instead, so the arrows are hidden there). Each arrow moves one card
 * (the rail's snap points keep it aligned) and hides itself at its end of
 * the row; both hide when everything already fits.
 */
export function RailCarousel({ className, children }: { className: string; children: React.ReactNode }) {
  const listRef = useRef<HTMLUListElement>(null);
  const listId = useId();
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(true);

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    const update = () => {
      setAtStart(el.scrollLeft <= 1);
      setAtEnd(el.scrollLeft >= el.scrollWidth - el.clientWidth - 1);
    };
    update();
    el.addEventListener("scroll", update, { passive: true });
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => {
      el.removeEventListener("scroll", update);
      observer.disconnect();
    };
  }, []);

  const step = useCallback((direction: -1 | 1) => {
    const el = listRef.current;
    const first = el?.firstElementChild;
    if (!el || !first) return;
    const gap = parseFloat(getComputedStyle(el).columnGap) || 0;
    el.scrollBy({ left: direction * (first.getBoundingClientRect().width + gap), behavior: "smooth" });
  }, []);

  return (
    <div className="relative">
      <ul id={listId} ref={listRef} className={className}>
        {children}
      </ul>
      <ArrowButton side="left" hidden={atStart} controls={listId} onClick={() => step(-1)} />
      <ArrowButton side="right" hidden={atEnd} controls={listId} onClick={() => step(1)} />
    </div>
  );
}

function ArrowButton({
  side,
  hidden,
  controls,
  onClick,
}: {
  side: "left" | "right";
  hidden: boolean;
  controls: string;
  onClick: () => void;
}) {
  const Icon = side === "left" ? ChevronLeft : ChevronRight;
  return (
    <button
      type="button"
      aria-label={side === "left" ? "Previous products" : "Next products"}
      aria-controls={controls}
      // Hidden at its end of the row: disabled (out of the tab order and
      // unclickable) and faded out rather than unmounted, so the other
      // arrow doesn't shift.
      disabled={hidden}
      onClick={onClick}
      className={cn(
        // Vertically centred on the cards' photos (the top part of each card).
        "absolute top-[35%] z-10 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-background/90 text-foreground shadow-md backdrop-blur transition-opacity hover:border-gold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-ink md:flex",
        side === "left" ? "left-2" : "right-2",
        hidden && "pointer-events-none opacity-0",
      )}
    >
      <Icon className="h-5 w-5" aria-hidden="true" />
    </button>
  );
}
