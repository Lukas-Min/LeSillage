"use client";

import { cn } from "@/lib/utils";
import type { SizePickerOption } from "@/domain/variant-options";

// SizePickerOption/VariantSubOption/findSelectedVariant live in
// src/domain/variant-options.ts (no "use client"). Only the types are
// re-exported here (erased at build time, so re-exporting them through a
// "use client" file is safe) — findSelectedVariant itself must be imported
// straight from that module by any consumer, since re-exporting a real
// function through this file would still mark it as a client reference and
// make it uncallable from a Server Component.
export type { SizePickerOption, VariantSubOption } from "@/domain/variant-options";

const DENSITY = {
  default: "h-11 min-w-[3.5rem] px-4 text-xs",
  compact: "h-9 min-w-[2.75rem] px-2.5 text-[10px]",
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
  /** Fires with whichever leaf skuId was clicked — a group's own skuId, or
   *  one of its subOptions'. Resolve the full selection with
   *  findSelectedVariant. */
  onSelect: (skuId: string) => void;
  density?: "default" | "compact";
  className?: string;
}) {
  const selectedGroup = options.find(
    (o) => o.skuId === selectedSkuId || o.subOptions?.some((s) => s.skuId === selectedSkuId),
  );
  return (
    <div className={className}>
      <div className={cn("flex flex-wrap gap-2", density === "compact" && "gap-1.5")}>
        {options.map((option) => {
          const isSelected = option === selectedGroup;
          return (
            <button
              key={option.skuId}
              type="button"
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                onSelect(option.skuId);
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
      {selectedGroup?.subOptions && selectedGroup.subOptions.length > 1 ? (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {selectedGroup.subOptions.map((sub) => {
            const isSelected = sub.skuId === selectedSkuId;
            return (
              <button
                key={sub.skuId}
                type="button"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  onSelect(sub.skuId);
                }}
                aria-pressed={isSelected}
                className={cn(
                  "inline-flex h-8 items-center justify-center rounded-md border px-3 text-[10px] uppercase tracking-[0.15em] transition-colors",
                  isSelected
                    ? "border-foreground bg-foreground text-background"
                    : "border-border bg-background hover:bg-muted",
                )}
              >
                {sub.label}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
