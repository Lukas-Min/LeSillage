import Link from "next/link";
import { cn } from "@/lib/utils";
import type { ProductType } from "@/db/schema";
import { DECANT_SIZES_ML } from "@/domain/decant";

type Mode = "bottles" | "decants" | "all";

const BOTTLES_FILTERS: Array<{ type?: ProductType; label: string; href: string }> = [
  { label: "All", href: "/bottles" },
  { type: "FULL_BOTTLE", label: "Full bottles", href: "/bottles?type=FULL_BOTTLE" },
  { type: "PARTIAL", label: "Partials", href: "/bottles?type=PARTIAL" },
];

const ALL_FILTERS: Array<{ type?: ProductType; label: string; href: string }> = [
  { label: "All", href: "/shop" },
  { type: "DECANT", label: "Decants", href: "/shop?type=DECANT" },
  { type: "FULL_BOTTLE", label: "Full bottles", href: "/shop?type=FULL_BOTTLE" },
  { type: "PARTIAL", label: "Partials", href: "/shop?type=PARTIAL" },
];

function filtersForMode(mode: Mode) {
  if (mode === "bottles") return BOTTLES_FILTERS;
  if (mode === "all") return ALL_FILTERS;
  return [];
}

export function ShopFilters({
  mode = "all",
  activeType,
  showDecantSizes = false,
  activeSize,
}: {
  mode?: Mode;
  activeType?: ProductType;
  showDecantSizes?: boolean;
  activeSize?: number;
}) {
  const typeFilters = filtersForMode(mode);
  return (
    <div className="mb-6 space-y-3">
      {typeFilters.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {typeFilters.map((filter) => {
            const isActive = filter.type === activeType || (!filter.type && !activeType);
            return (
              <Link
                key={filter.href}
                href={filter.href}
                className={cn(
                  "inline-flex min-h-11 items-center rounded-full border px-4 text-sm",
                  isActive
                    ? "border-foreground bg-foreground text-background"
                    : "border-border bg-background hover:bg-muted",
                )}
              >
                {filter.label}
              </Link>
            );
          })}
        </div>
      ) : null}
      {showDecantSizes ? (
        <div className="flex flex-wrap gap-2">
          {DECANT_SIZES_ML.map((size) => {
            const href = `/decants?size=${size}`;
            const isActive = activeSize === size;
            return (
              <Link
                key={size}
                href={href}
                className={cn(
                  "inline-flex min-h-11 items-center rounded-full border px-4 text-sm",
                  isActive
                    ? "border-foreground bg-foreground text-background"
                    : "border-border bg-background hover:bg-muted",
                )}
              >
                {size}ml
              </Link>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
