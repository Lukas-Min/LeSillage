"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { estimateMarqueeCopyWidth, marqueeCopies, SSR_MARQUEE_BAR_WIDTH } from "@/domain/announcement";

/** Scroll speed. Constant in pixels, so the bar reads at the same pace whether
 *  it carries one short line or eight long ones. */
const PIXELS_PER_SECOND = 55;

/** The bar's desktop font size (`sm:text-[13px]` below) — what the
 *  pre-hydration width estimate is calibrated against. */
const FONT_PX = 13;

function secondsFor(copyWidth: number): number {
  return Math.max(8, copyWidth / PIXELS_PER_SECOND);
}

/**
 * What the server renders before any measurement exists. Estimated from the
 * text alone and sized for a wide monitor, because the CSS animation starts
 * on first paint — a fixed two-copy default left a blank tail scrolling past
 * on any desktop until hydration caught up.
 */
function initialLoop(messages: string[]): { copies: number; duration: number } {
  const estimate = estimateMarqueeCopyWidth(messages, FONT_PX);
  return { copies: marqueeCopies(SSR_MARQUEE_BAR_WIDTH, estimate), duration: secondsFor(estimate) };
}

/** A promo code: all caps, four or more characters, and containing a digit —
 *  enough to catch WELCOME10 without emphasising ordinary words like ORDER. */
const CODE_PATTERN = /^[A-Z][A-Z0-9]{3,}$/;

function renderMessage(message: string) {
  return message.split(/(\b[A-Z][A-Z0-9]{3,}\b)/g).map((part, index) =>
    CODE_PATTERN.test(part) && /\d/.test(part) ? (
      <strong key={index} className="mx-0.5 font-semibold tracking-[0.08em]">
        {part}
      </strong>
    ) : (
      part
    ),
  );
}

/**
 * The permanently scrolling announcement bar, rendered inside the sticky header.
 *
 * The track holds N identical copies of the message list and animates by
 * exactly one copy's width (100/N percent of the track), which lands copy 2
 * where copy 1 began — so the loop closes with no visible seam.
 *
 * N is measured rather than fixed: two copies only look infinite while one copy
 * is at least as wide as the bar. On a wide screen (or with short messages) the
 * pair runs out before the loop restarts and you see the blank tail, so the
 * copies are recomputed from the real widths whenever either changes. The
 * server render seeds N from a text-length estimate (`initialLoop`) so that
 * first paint is already covered while the client bundle is still loading.
 */
export function PromoMarquee({ messages }: { messages: string[] }) {
  const pathname = usePathname();
  const barRef = useRef<HTMLElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const [loop, setLoop] = useState(() => initialLoop(messages));

  useEffect(() => {
    const bar = barRef.current;
    const list = listRef.current;
    if (!bar || !list) return;

    const measure = () => {
      const listWidth = list.getBoundingClientRect().width;
      // A collapsed or not-yet-laid-out bar would otherwise pin this to the
      // two-copy minimum; the viewport is the better guess in that case.
      const barWidth = bar.getBoundingClientRect().width || window.innerWidth;
      if (listWidth < 1) return;
      const copies = marqueeCopies(barWidth, listWidth);
      const duration = secondsFor(listWidth);
      setLoop((current) =>
        current.copies === copies && Math.abs(current.duration - duration) < 0.01 ? current : { copies, duration },
      );
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(bar);
    observer.observe(list);
    return () => observer.disconnect();
  }, [messages]);

  // The admin portal shares the root layout with the storefront; a customer
  // promo bar has no business above the admin tools.
  if (pathname?.startsWith("/admin") || messages.length === 0) return null;

  return (
    <aside
      ref={barRef}
      aria-label="Store promotions"
      className="marquee overflow-hidden bg-gold text-gold-foreground"
    >
      <div
        className="marquee-track flex w-max"
        style={
          {
            "--marquee-shift": `${100 / loop.copies}%`,
            "--marquee-duration": `${loop.duration.toFixed(2)}s`,
          } as React.CSSProperties
        }
      >
        {Array.from({ length: loop.copies }).map((_, copy) => (
          <ul
            key={copy}
            ref={copy === 0 ? listRef : undefined}
            className="flex shrink-0 items-center"
            // Only the first copy carries the message for assistive tech; the
            // rest exist purely to keep the loop seamless.
            aria-hidden={copy > 0 ? true : undefined}
          >
            {messages.map((message, index) => (
              <li
                key={`${copy}-${index}`}
                className="flex items-center whitespace-nowrap py-2 text-xs tracking-wide sm:text-[13px]"
              >
                {renderMessage(message)}
                <span aria-hidden className="px-3 opacity-60">
                  {" ◆ "}
                </span>
              </li>
            ))}
          </ul>
        ))}
      </div>
    </aside>
  );
}
