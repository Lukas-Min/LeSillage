import Link from "next/link";
import { cn } from "@/lib/utils";
import type { ProductType } from "@/db/schema";
import { DECANT_SIZES_ML } from "@/domain/decant";

const TYPE_FILTERS: Array<{ type?: ProductType; label: string; href: string }> = [
  { label: "All", href: "/shop" },
  { type: "DECANT", label: "Decants", href: "/shop?type=DECANT" },
  { type: "FULL_BOTTLE", label: "Full bottles", href: "/shop?type=FULL_BOTTLE" },
  { type: "PARTIAL", label: "Partials", href: "/shop?type=PARTIAL" },
];

const pillClass = (active: boolean) =>
  cn(
    "inline-flex min-h-11 items-center rounded-md border px-4 text-xs uppercase tracking-[0.2em] transition-colors",
    active
      ? "border-foreground bg-foreground text-background"
      : "border-border bg-background hover:bg-muted",
  );

export function ShopFilters({
  activeType,
  showDecantSizes = false,
  activeSize,
}: {
  activeType?: ProductType;
  showDecantSizes?: boolean;
  activeSize?: number;
}) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap justify-center gap-2">
        {TYPE_FILTERS.map((filter) => {
          const isActive = filter.type === activeType || (!filter.type && !activeType);
          return (
            <Link key={filter.href} href={filter.href} className={pillClass(isActive)}>
              {filter.label}
            </Link>
          );
        })}
      </div>
      {showDecantSizes ? (
        <div className="flex flex-wrap justify-center gap-2">
          {DECANT_SIZES_ML.map((size) => {
            const href = `/shop?type=DECANT&size=${size}`;
            const isActive = activeSize === size;
            return (
              <Link key={size} href={href} className={pillClass(isActive)}>
                {size}ml
              </Link>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
