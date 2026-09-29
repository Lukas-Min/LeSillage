"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import {
  ArrowRight,
  BadgePercent,
  ChevronDown,
  Droplet,
  Gem,
  Globe,
  LayoutGrid,
  PackageCheck,
  PackageOpen,
  Sparkles,
  SprayCan,
  Star,
  Tag,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface ShopMenuLink {
  href: string;
  label: string;
  icon: LucideIcon;
}

/**
 * The shop's entry points, shared by the desktop mega menu and the phone
 * hamburger menu so the two never drift. Every link is a /shop view (a
 * shelf, a filter, or a sort), replacing the old in-page shelf tabs.
 */
export const SHOP_MENU_GROUPS: Array<{ title: string; links: ShopMenuLink[] }> = [
  {
    title: "Shop by type",
    links: [
      { href: "/shop", label: "All fragrances", icon: LayoutGrid },
      { href: "/shop?type=DECANT", label: "Decants", icon: Droplet },
      { href: "/shop?type=FULL_BOTTLE", label: "Full bottles", icon: SprayCan },
      { href: "/shop?type=PARTIAL", label: "Partials", icon: PackageOpen },
    ],
  },
  {
    title: "Scent family",
    links: [
      { href: "/shop?category=MIDDLE_EASTERN", label: "Middle Eastern", icon: Globe },
      { href: "/shop?category=DESIGNER", label: "Designer", icon: Tag },
      { href: "/shop?category=NICHE", label: "Niche", icon: Gem },
    ],
  },
  {
    title: "Discover",
    links: [
      { href: "/shop?sort=discount_desc", label: "On sale", icon: BadgePercent },
      { href: "/shop?sort=newest", label: "New arrivals", icon: Sparkles },
      { href: "/shop?sort=rating", label: "Highest rated", icon: Star },
      { href: "/shop?stock=ON_HAND", label: "Ready to ship", icon: PackageCheck },
    ],
  },
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
          <div className="grid grid-cols-3 gap-8 px-8 py-8 normal-case tracking-normal lg:grid-cols-[repeat(3,minmax(0,1fr))_minmax(0,1.3fr)] 2xl:mx-auto 2xl:max-w-[80vw]">
            {SHOP_MENU_GROUPS.map((group) => (
              <div key={group.title} className="space-y-3">
                <p className="text-[10px] uppercase tracking-[0.3em] text-gold-ink">{group.title}</p>
                <ul className="space-y-0.5">
                  {group.links.map(({ href, label, icon: Icon }) => (
                    <li key={href}>
                      <Link
                        href={href}
                        onClick={close}
                        className="group/link -mx-2 flex min-h-10 items-center gap-3 rounded-md px-2 text-sm text-foreground/85 transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-gold-ink"
                      >
                        <Icon className="h-4 w-4 text-gold-ink" aria-hidden="true" />
                        {label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
            <Link
              href="/shop?type=DECANT"
              onClick={close}
              className="group/tile relative col-span-3 flex min-h-36 flex-col justify-end overflow-hidden rounded-md border border-gold/35 bg-[color-mix(in_oklch,var(--card),var(--gold)_10%)] p-6 transition-colors hover:border-gold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-ink lg:col-span-1"
            >
              <span className="pointer-events-none absolute inset-2 border border-gold/20" aria-hidden="true" />
              <Droplet
                className="pointer-events-none absolute -right-4 -top-4 h-32 w-32 text-gold/15 transition-colors group-hover/tile:text-gold/25"
                aria-hidden="true"
              />
              <p className="relative text-[10px] uppercase tracking-[0.3em] text-gold-ink">Try before the bottle</p>
              <p className="relative mt-1.5 font-serif-display text-2xl leading-tight">Decants from 3 ml</p>
              <span className="relative mt-3 inline-flex items-center gap-1 text-xs uppercase tracking-[0.2em] text-gold-ink">
                Shop decants
                <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover/tile:translate-x-0.5" aria-hidden="true" />
              </span>
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}
