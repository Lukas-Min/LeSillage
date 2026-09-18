import Link from "next/link";
import { cn } from "@/lib/utils";
import type { ProductType } from "@/db/schema";

const TYPE_FILTERS: Array<{ type?: ProductType; label: string; href: string }> = [
  { type: "DECANT", label: "Decants", href: "/shop?type=DECANT" },
  { type: "FULL_BOTTLE", label: "Full bottles", href: "/shop?type=FULL_BOTTLE" },
  { type: "PARTIAL", label: "Partials", href: "/shop?type=PARTIAL" },
];

export function ShopFilters({ activeType }: { activeType?: ProductType }) {
  return (
    // Never wraps to a second row on a narrow phone — scrolls horizontally
    // instead, scrollbar hidden (same pattern as the admin type tabs).
    // `shrink-0` on each link stops flex from squeezing their text before
    // overflow kicks in. Left-aligned (not centered) while it's narrow
    // enough to possibly need that scroll: centering a row that overflows
    // starts it scrolled to the middle, clipping both the first and last
    // tab instead of opening on "Decants" fully in view.
    <div className="scrollbar-hide flex w-full items-center justify-start gap-x-8 overflow-x-auto sm:justify-center">
      {TYPE_FILTERS.map((filter) => {
        const isActive = filter.type === activeType || (!filter.type && !activeType);
        return (
          <Link
            key={filter.href}
            href={filter.href}
            className={cn(
              "relative inline-flex min-h-11 shrink-0 items-center pb-2 text-xs uppercase tracking-[0.22em] transition-colors",
              isActive ? "font-medium text-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {filter.label}
            {isActive ? <span className="absolute inset-x-0 -bottom-px h-[1.5px] bg-foreground" /> : null}
          </Link>
        );
      })}
    </div>
  );
}
