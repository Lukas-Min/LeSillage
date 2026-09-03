"use client";

import { cn } from "@/lib/utils";
import type { Condition, Fulfillment } from "@/db/schema";

/** One real, purchasable size for a decant product — never a placeholder for a size the product doesn't offer. */
export interface SizePickerOption {
  sizeMl: number;
  label: string;
  skuId: string;
  fulfillment: Fulfillment;
  condition?: Condition;
  originalCentavos: number;
  discountedCentavos: number;
  savedCentavos: number;
}

const DENSITY = {
  default: "h-11 min-w-[3.5rem] px-4 text-xs",
  compact: "h-11 min-w-[2.75rem] px-2.5 text-[10px]",
} as const;

export function SizePicker({
  options,
  selectedSkuId,
  onSelect,
  density = "default",
  className,
}: {
  options: SizePickerOption[];
  selectedSkuId: string | null;
  onSelect: (option: SizePickerOption) => void;
  density?: "default" | "compact";
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap gap-2", density === "compact" && "gap-1.5", className)}>
      {options.map((option) => {
        const isSelected = option.skuId === selectedSkuId;
        return (
          <button
            key={option.skuId}
            type="button"
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              onSelect(option);
            }}
            aria-pressed={isSelected}
            className={cn(
              "inline-flex items-center justify-center border uppercase tracking-[0.2em] transition-colors",
              DENSITY[density],
              isSelected
                ? "border-foreground bg-foreground text-background"
                : "border-border bg-background hover:bg-muted",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
