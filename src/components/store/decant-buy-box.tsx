"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { AddToCartButton } from "@/components/store/add-to-cart-button";
import { BuyNowButton } from "@/components/store/buy-now-button";
import { Price } from "@/components/store/price";
import { SizePicker } from "@/components/store/size-picker";
import { findSelectedVariant, type SizePickerOption } from "@/domain/variant-options";

export function DecantBuyBox({
  options,
  initialSkuId,
}: {
  options: SizePickerOption[];
  initialSkuId: string;
}) {
  const [selectedSkuId, setSelectedSkuId] = useState(initialSkuId);
  const [quantity, setQuantity] = useState(1);
  const selected = findSelectedVariant(options, selectedSkuId) ?? options[0];

  function select(skuId: string) {
    setSelectedSkuId(skuId);
    window.history.replaceState(null, "", `/shop/${skuId}`);
  }

  return (
    <>
      {/* Condition is a full-bottle/partial concept. Retail and In-house
          decants are distinguished on the size buttons themselves. */}
      <div className="flex flex-wrap gap-2">
        <Badge variant="outline" className="h-auto px-3 py-1.5 text-sm">
          {selected.fulfillment === "PRE_ORDER" ? "Pre-order · 3 to 30 days" : "On hand · 1 to 2 days"}
        </Badge>
        {selected.soldOut ? (
          <Badge variant="destructive" className="h-auto px-3 py-1.5 text-sm">
            Sold out
          </Badge>
        ) : null}
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

      {selected.soldOut ? (
        <p className="text-sm text-destructive">Sold out — check back soon.</p>
      ) : (
        <div className="space-y-2">
          <AddToCartButton
            skuId={selected.skuId}
            quantity={quantity}
            onQuantityChange={setQuantity}
          />
          <BuyNowButton skuId={selected.skuId} quantity={quantity} />
        </div>
      )}
    </>
  );
}
