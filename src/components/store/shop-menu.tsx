"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { ShopTile } from "@/components/store/shop-tile";
import { cn } from "@/lib/utils";

/**
 * The shop's shelves as cards (All first), shared by the header's Shop menu
 * and the phone hamburger menu. Same copy as the homepage Browse-by-type rows.
 */
export const SHOP_TYPE_TILES: Array<{ href: string; title: string; description: string }> = [
  { href: "/shop", title: "All fragrances", description: "Every bottle, partial, and decant" },
  { href: "/shop?type=DECANT", title: "Decants", description: "Try before the full bottle" },
  { href: "/shop?type=FULL_BOTTLE", title: "Full bottles", description: "Sealed, ready to ship" },
  { href: "/shop?type=PARTIAL", title: "Partials", description: "Opened once, priced to move" },
];

const PANEL_ID = "shop-mega-menu";
/** Grace period for the pointer to travel from "Shop" down into the panel. */
const CLOSE_DELAY_MS = 150;

/**
 * Desktop (md+) "Shop" nav item: hovering it, or the panel, opens a
 * full-width menu under the header. Keyboard: the chevron button toggles it
 * (aria-expanded), focus moving out closes it, and Escape closes it and
 * returns focus to the button. "Shop" itself stays a plain link to /shop.
 */
export function ShopMegaMenu({ active }: { active: boolean }) {
  const [open, setOpen] = useState(false);
  const closeTimer = useRef<number | null>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  const cancelClose = useCallback(() => {
    if (closeTimer.current !== null) window.clearTimeout(closeTimer.current);
    closeTimer.current = null;
  }, []);
  const openNow = useCallback(() => {
    cancelClose();
    setOpen(true);
  }, [cancelClose]);
  const closeSoon = useCallback(() => {
    cancelClose();
    closeTimer.current = window.setTimeout(() => setOpen(false), CLOSE_DELAY_MS);
  }, [cancelClose]);
  const close = useCallback(() => {
    cancelClose();
    setOpen(false);
  }, [cancelClose]);

  // A new page closes it (query-only changes don't change pathname, so each
  // panel link also closes it on click).
  useEffect(() => {
    Promise.resolve().then(close);
  }, [pathname, close]);
  useEffect(() => cancelClose, [cancelClose]);

  // Hover via native pointer events on the wrapper (the panel is inside it,
  // so moving from "Shop" down into the panel never counts as leaving), and
  // only for a real mouse: a tap on a touch tablet fires pointerenter too,
  // and there the chevron button and the "Shop" link are the controls.
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const onEnter = (event: PointerEvent) => {
      if (event.pointerType === "mouse") openNow();
    };
    const onLeave = (event: PointerEvent) => {
      if (event.pointerType === "mouse") closeSoon();
    };
    root.addEventListener("pointerenter", onEnter);
    root.addEventListener("pointerleave", onLeave);
    return () => {
      root.removeEventListener("pointerenter", onEnter);
      root.removeEventListener("pointerleave", onLeave);
    };
  }, [openNow, closeSoon]);

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        close();
        toggleRef.current?.focus();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, close]);

  return (
    <div
      ref={rootRef}
      onBlur={(event) => {
        if (!rootRef.current?.contains(event.relatedTarget as Node | null)) close();
      }}
      className="flex items-center"
    >
      <Link
        href="/shop"
        onClick={close}
        className={cn(
          "relative inline-flex min-h-11 items-center transition-colors hover:text-foreground",
          active || open ? "text-foreground" : "text-muted-foreground",
        )}
      >
        Shop
        {active ? <span className="absolute inset-x-0 -bottom-px h-px bg-gold" /> : null}
      </Link>
      <button
        ref={toggleRef}
        type="button"
        data-size="icon"
        aria-expanded={open}
        aria-controls={PANEL_ID}
        aria-label={open ? "Hide shop menu" : "Show shop menu"}
        onClick={() => (open ? close() : openNow())}
        className="inline-flex h-11 w-6 items-center justify-center text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-gold-ink"
      >
        <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-180")} aria-hidden="true" />
      </button>

      {open ? (
        // `fixed`, but anchored to the sticky <header>, not the viewport: the
        // header's backdrop-blur makes it the containing block for fixed
        // descendants (and nothing between here and it has a transform —
        // the nav is centred without one for exactly this reason). So
        // inset-x-0/top-full = the header's full width, right under it and
        // the promo bar, and it rides along with the sticky header.
        <div
          id={PANEL_ID}
          className="fixed inset-x-0 top-full z-40 border-y border-border bg-background shadow-[0_24px_48px_-24px_rgba(31,28,24,0.35)]"
        >
          <ul className="grid grid-cols-4 gap-4 px-8 py-6 normal-case tracking-normal 2xl:mx-auto 2xl:max-w-[80vw]">
            {SHOP_TYPE_TILES.map((tile) => (
              <li key={tile.href}>
                <ShopTile {...tile} size="menu" as="p" onClick={close} />
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
