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
 * A segmented control: one bordered bar, the active shelf filled solid.
 * Phone: the bar spans the content width with four equal segments
 * (sentence case at 13px, so "Full bottles" fits a quarter of a 360px
 * phone). sm+: the bar shrinks to its labels and centres. Each segment is a
 * 40px-tall link inside the bar's 4px padding.
 */
export function ShopFilters({ activeType }: { activeType?: ProductType }) {
  return (
    <nav
      aria-label="Shop shelves"
      className="flex w-full rounded-md border border-border bg-card p-1 sm:w-auto"
    >
      {TYPE_FILTERS.map((filter) => {
        const isActive = filter.type === activeType || (!filter.type && !activeType);
        return (
          <Link
            key={filter.href}
            href={filter.href}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "inline-flex min-h-10 flex-1 items-center justify-center whitespace-nowrap rounded-sm px-2 text-[13px] font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-gold-ink sm:flex-none sm:px-5",
              isActive
                ? "bg-foreground text-background"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            {filter.label}
          </Link>
        );
      })}
    </nav>
  );
}
