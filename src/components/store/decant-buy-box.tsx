"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { AddToCartButton } from "@/components/store/add-to-cart-button";
import { Price } from "@/components/store/price";
import { labelForCondition } from "@/domain/product-type";
import { cn } from "@/lib/utils";
import type { Condition, Fulfillment } from "@/db/schema";

export interface DecantSizeOption {
  sizeMl: number;
  label: string;
  available: boolean;
  skuId?: string;
  fulfillment?: Fulfillment;
  condition?: Condition;
  originalCentavos?: number;
  discountedCentavos?: number;
  savedCentavos?: number;
}

export function DecantBuyBox({
  options,
  initialSkuId,
}: {
  options: DecantSizeOption[];
  initialSkuId: string;
}) {
  const initialIndex = Math.max(
    0,
    options.findIndex((o) => o.skuId === initialSkuId),
  );
  const [index, setIndex] = useState(initialIndex);
  const [quantity, setQuantity] = useState(1);
  const selected = options[index];

  function select(nextIndex: number, skuId: string) {
    setIndex(nextIndex);
    window.history.replaceState(null, "", `/shop/${skuId}`);
  }

  return (
    <>
      <div className="flex flex-wrap gap-2">
        <Badge variant="outline">
          {selected.fulfillment === "PRE_ORDER" ? "Pre-order · 3 to 30 days" : "On hand · 1 to 2 days"}
        </Badge>
        {selected.condition ? <Badge variant="outline">{labelForCondition(selected.condition)}</Badge> : null}
      </div>

      <div className="space-y-3">
        <p className="text-[10px] uppercase tracking-[0.28em] text-muted-foreground">Size</p>
        <div className="flex flex-wrap gap-2">
          {options.map((option, i) => {
            if (!option.available || !option.skuId) {
              return (
                <span
                  key={option.sizeMl}
                  className="inline-flex h-11 min-w-[3.5rem] cursor-not-allowed items-center justify-center border border-dashed border-border px-4 text-xs uppercase tracking-[0.2em] text-muted-foreground"
                >
                  {option.label}
                </span>
              );
            }
            return (
              <button
                key={option.sizeMl}
                type="button"
                onClick={() => select(i, option.skuId!)}
                className={cn(
                  "inline-flex h-11 min-w-[3.5rem] items-center justify-center border px-4 text-xs uppercase tracking-[0.2em] transition-colors",
                  i === index
                    ? "border-foreground bg-foreground text-background"
                    : "border-border bg-background hover:bg-muted",
                )}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </div>

      <Price
        originalCentavos={selected.originalCentavos ?? 0}
        discountedCentavos={selected.discountedCentavos ?? 0}
        savedCentavos={selected.savedCentavos ?? 0}
        quantity={quantity}
      />

      <AddToCartButton
        skuId={selected.skuId ?? ""}
        quantity={quantity}
        onQuantityChange={setQuantity}
      />
    </>
  );
}
