"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { AddToCartButton } from "@/components/store/add-to-cart-button";
import { Price } from "@/components/store/price";
import { SizePicker, type SizePickerOption } from "@/components/store/size-picker";

export function DecantBuyBox({
  options,
  initialSkuId,
}: {
  options: SizePickerOption[];
  initialSkuId: string;
}) {
  const initialIndex = Math.max(
    0,
    options.findIndex((o) => o.skuId === initialSkuId),
  );
  const [index, setIndex] = useState(initialIndex);
  const [quantity, setQuantity] = useState(1);
  const selected = options[index];

  function select(option: SizePickerOption) {
    const nextIndex = options.findIndex((o) => o.skuId === option.skuId);
    if (nextIndex < 0) return;
    setIndex(nextIndex);
    window.history.replaceState(null, "", `/shop/${option.skuId}`);
  }

  return (
    <>
      {/* No condition badge here — "Sealed"/"A few sprays missing" describe a
          specific physical bottle, but a decant is poured to order from a
          shared pool, so condition doesn't apply. */}
      <div className="flex flex-wrap gap-2">
        <Badge variant="outline">
          {selected.fulfillment === "PRE_ORDER" ? "Pre-order · 3 to 30 days" : "On hand · 1 to 2 days"}
        </Badge>
      </div>

      <div className="space-y-3">
        <p className="text-[10px] uppercase tracking-[0.28em] text-muted-foreground">Size</p>
        <SizePicker options={options} selectedSkuId={selected.skuId} onSelect={select} />
      </div>

      <Price
        originalCentavos={selected.originalCentavos}
        discountedCentavos={selected.discountedCentavos}
        savedCentavos={selected.savedCentavos}
        quantity={quantity}
      />

      <AddToCartButton
        skuId={selected.skuId}
        quantity={quantity}
        onQuantityChange={setQuantity}
      />
    </>
  );
}
