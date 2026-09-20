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
    // Phone: the three tabs share the full content width (`flex-1` each,
    // label centered in its cell) so the row reads centered and edge-to-edge
    // without a gap to tune. `sm+`: back to a natural-width centered row with
    // a fixed gap. Never wraps to a second line — `whitespace-nowrap` keeps
    // each label intact, and if the viewport is too narrow for all three
    // (~<320px) the row scrolls horizontally, scrollbar hidden, opening on
    // "Decants" fully in view. `overflow-y-hidden` explicitly: `overflow-x-auto`
    // alone forces the y-axis to `auto` too, and the old 1px underline poking
    // outside the link box was enough to spawn a vertical scrollbar and clip
    // it — the underline now sits inside the label box for the same reason.
    <div className="scrollbar-hide flex w-full items-center overflow-x-auto overflow-y-hidden sm:justify-center sm:gap-x-8">
      {TYPE_FILTERS.map((filter) => {
        const isActive = filter.type === activeType || (!filter.type && !activeType);
        return (
          <Link
            key={filter.href}
            href={filter.href}
            className={cn(
              "inline-flex min-h-11 flex-1 items-center justify-center text-xs uppercase tracking-[0.22em] whitespace-nowrap transition-colors sm:flex-none",
              isActive ? "font-medium text-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            <span className="relative pb-2">
              {filter.label}
              {isActive ? <span className="absolute inset-x-0 bottom-0 h-[1.5px] bg-foreground" /> : null}
            </span>
          </Link>
        );
      })}
    </div>
  );
}
