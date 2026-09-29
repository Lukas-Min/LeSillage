import Link from "next/link";
import { cn } from "@/lib/utils";
import type { ProductType } from "@/db/schema";

const TYPE_FILTERS: Array<{ type?: ProductType; label: string; href: string }> = [
  { label: "All", href: "/shop" },
  { type: "DECANT", label: "Decants", href: "/shop?type=DECANT" },
  { type: "FULL_BOTTLE", label: "Full bottles", href: "/shop?type=FULL_BOTTLE" },
  { type: "PARTIAL", label: "Partials", href: "/shop?type=PARTIAL" },
];

/**
 * Underlined tabs that read as one connected row: a 1px rule runs under the
 * whole row (an inset shadow, so it sits inside the row's box and can't be
 * clipped by the horizontal scroller), and the active tab's 2px underline
 * spans its full cell, not just the word. No gaps between cells, so the
 * underline meets its neighbours' rule edge to edge.
 *
 * Phone: four equal cells across the content width (tighter letter-spacing
 * so all four fit a 360px phone). sm+: fixed-padding cells, the row shrinks
 * to them and the page centres it. Never wraps; on a very narrow screen the
 * row scrolls horizontally, scrollbar hidden, opening on "All".
 */
export function ShopFilters({ activeType }: { activeType?: ProductType }) {
  return (
    <nav
      aria-label="Shop shelves"
      className="scrollbar-hide flex w-full overflow-x-auto overflow-y-hidden shadow-[inset_0_-1px_0_var(--border)] sm:w-auto"
    >
      {TYPE_FILTERS.map((filter) => {
        const isActive = filter.type === activeType || (!filter.type && !activeType);
        return (
          <Link
            key={filter.href}
            href={filter.href}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "inline-flex min-h-11 flex-1 items-center justify-center whitespace-nowrap border-b-2 px-2 text-xs uppercase tracking-[0.12em] transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-gold-ink sm:flex-none sm:px-6 sm:tracking-[0.22em]",
              isActive
                ? "border-foreground font-medium text-foreground"
                : "border-transparent text-muted-foreground hover:border-border hover:text-foreground",
            )}
          >
            {filter.label}
          </Link>
        );
      })}
    </nav>
  );
}
