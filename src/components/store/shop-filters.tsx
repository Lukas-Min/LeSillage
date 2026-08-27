import Link from "next/link";
import { cn } from "@/lib/utils";
import type { ProductType } from "@/db/schema";

const TYPE_FILTERS: Array<{ type?: ProductType; label: string; href: string }> = [
  { label: "All", href: "/shop" },
  { type: "DECANT", label: "Decants", href: "/shop?type=DECANT" },
  { type: "FULL_BOTTLE", label: "Full bottles", href: "/shop?type=FULL_BOTTLE" },
  { type: "PARTIAL", label: "Partials", href: "/shop?type=PARTIAL" },
];

export function ShopFilters({ activeType }: { activeType?: ProductType }) {
  return (
    <div className="flex flex-wrap justify-center gap-x-8 gap-y-2">
      {TYPE_FILTERS.map((filter) => {
        const isActive = filter.type === activeType || (!filter.type && !activeType);
        return (
          <Link
            key={filter.href}
            href={filter.href}
            className={cn(
              "relative inline-flex min-h-11 items-center pb-2 text-xs uppercase tracking-[0.22em] transition-colors",
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
