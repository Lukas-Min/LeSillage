"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { ShopTile } from "@/components/store/shop-tile";
import { cn } from "@/lib/utils";

type ShopMenuTile = { href: string; title: string; description: string };

const ALL_TILE: ShopMenuTile = { href: "/shop", title: "All fragrances", description: "Every bottle, partial, and decant" };
const TYPE_TILES: ShopMenuTile[] = [
  { href: "/shop?type=DECANT", title: "Decants", description: "Try before the full bottle" },
  { href: "/shop?type=FULL_BOTTLE", title: "Full bottles", description: "Sealed, ready to ship" },
  { href: "/shop?type=PARTIAL", title: "Partials", description: "Opened once, priced to move" },
];
const GENDER_TILES: ShopMenuTile[] = [
  { href: "/shop?gender=men", title: "Men", description: "Fragrances made for him" },
  { href: "/shop?gender=women", title: "Women", description: "Fragrances made for her" },
];

/**
 * The phone hamburger menu's cards, one column: All first, then the shelves,
 * then Men and Women. Same copy as the homepage Browse-by-type rows.
 */
export const SHOP_TYPE_TILES: ShopMenuTile[] = [ALL_TILE, ...TYPE_TILES, ...GENDER_TILES];

/** The header's Shop menu, three per row: the shelves, then All, Men, Women. */
const MENU_TILES: ShopMenuTile[] = [...TYPE_TILES, ALL_TILE, ...GENDER_TILES];

const PANEL_ID = "shop-mega-menu";
/** Grace period for the pointer to travel from "Shop" down into the panel. */
const CLOSE_DELAY_MS = 150;
/** How long the panel takes to animate out; it unmounts after this. */
const EXIT_MS = 180;

/**
 * Desktop (md+) "Shop" nav item: a dropdown button, not a link. Hovering it,
 * or the panel, opens a full-width menu under the header; clicking or
 * Enter/Space toggles it (aria-expanded), focus moving out closes it, and
 * Escape closes it and returns focus to the button.
 */
export function ShopMegaMenu({ active }: { active: boolean }) {
  const [open, setOpen] = useState(false);
  // Stays true through the exit animation, so the panel can fade out
  // instead of vanishing; `open` alone decides what it shows as.
  const [rendered, setRendered] = useState(false);
  const closeTimer = useRef<number | null>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const hoverOpened = useRef(false);
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
    hoverOpened.current = false;
    setOpen(false);
  }, [cancelClose]);

  // A new page closes it (query-only changes don't change pathname, so each
  // panel link also closes it on click).
  useEffect(() => {
    Promise.resolve().then(close);
  }, [pathname, close]);
  useEffect(() => cancelClose, [cancelClose]);

  useEffect(() => {
    if (open) {
      Promise.resolve().then(() => setRendered(true));
      return;
    }
    // A timer, not animationend: with reduced motion there's no animation
    // and so no event, and the panel would never unmount.
    const timer = window.setTimeout(() => setRendered(false), EXIT_MS);
    return () => window.clearTimeout(timer);
  }, [open]);

  // Hover via native pointer events on the wrapper (the panel is inside it,
  // so moving from "Shop" down into the panel never counts as leaving), and
  // only for a real mouse: a tap on a touch tablet fires pointerenter too,
  // and there the chevron button and the "Shop" link are the controls.
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const onEnter = (event: PointerEvent) => {
      if (event.pointerType !== "mouse") return;
      hoverOpened.current = true;
      openNow();
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
    // Clicking or tapping anywhere outside closes it. (Blur can't do this
    // job: Safari doesn't focus a link on click, so clicking a card inside
    // the menu also blurs to "nothing", and closing then would unmount the
    // card before its click lands.)
    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) close();
    }
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [open, close]);

  return (
    <div
      ref={rootRef}
      onBlur={(event) => {
        // Only when keyboard focus lands somewhere real outside the menu
        // (Tab past its last card). A null relatedTarget is a click; the
        // outside-press listener above handles those.
        const next = event.relatedTarget as Node | null;
        if (next && !rootRef.current?.contains(next)) close();
      }}
      className="flex items-center"
    >
      {/* Not a link: "Shop" only opens the menu (its "All fragrances" card is
          the way to /shop). Hover opens it with a mouse; a click, Enter, or
          Space toggles it, except that a mouse click right after hover
          opened it keeps it open instead of snapping it shut. */}
      <button
        ref={toggleRef}
        type="button"
        data-size="icon"
        aria-expanded={open}
        aria-controls={PANEL_ID}
        onClick={(event) => {
          if (event.detail > 0 && hoverOpened.current) {
            hoverOpened.current = false;
            return;
          }
          if (open) close();
          else openNow();
        }}
        className={cn(
          "relative inline-flex min-h-11 items-center gap-1 uppercase tracking-[0.22em] transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-ink",
          active || open ? "text-foreground" : "text-muted-foreground",
        )}
      >
        Shop
        <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-180")} aria-hidden="true" />
        {active ? <span className="absolute inset-x-0 -bottom-px h-px bg-gold" /> : null}
      </button>

      {open || rendered ? (
        <>
          {/* An invisible bridge over the promo banner, between the nav row
              (h-14) and the panel. It's inside this wrapper, so moving the
              mouse from "Shop" down across the banner never counts as
              leaving, and a slow move no longer closes the menu. Fixed
              against the header like the panel (see below). */}
          {open ? <div className="fixed inset-x-0 top-14 bottom-0 z-40" aria-hidden="true" /> : null}
          {/* `fixed`, but anchored to the sticky <header>, not the viewport:
              the header sets `contain: layout`, which makes it the containing
              block for fixed descendants (and nothing between here and it has
              a transform — the nav is centred without one for exactly this
              reason). So inset-x-0/top-full = the header's full width, right
              under it and the promo bar, and it rides along with the sticky
              header. Full width on every screen, ultra-wide included. */}
          <div
            id={PANEL_ID}
            data-state={open ? "open" : "closed"}
            inert={!open}
            className="fixed inset-x-0 top-full z-40 border-y border-border bg-background shadow-[0_24px_48px_-24px_rgba(31,28,24,0.35)] duration-200 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:slide-out-to-top-2 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:slide-in-from-top-2 motion-reduce:animate-none"
          >
            <ul className="grid grid-cols-3 gap-4 px-8 py-6 normal-case tracking-normal">
              {MENU_TILES.map((tile, index) => (
                <li
                  key={tile.href}
                  // Cards follow the panel in a quick stagger, row by row.
                  style={{ animationDelay: `${60 + index * 30}ms` }}
                  className="duration-300 fill-mode-both animate-in fade-in-0 slide-in-from-top-1 motion-reduce:animate-none"
                >
                  <ShopTile {...tile} size="menu" as="p" onClick={close} />
                </li>
              ))}
            </ul>
          </div>
        </>
      ) : null}
    </div>
  );
}
