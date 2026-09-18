"use client";

import { useState } from "react";
import { AddToCartButton } from "@/components/store/add-to-cart-button";
import { BuyNowButton } from "@/components/store/buy-now-button";
import { Price } from "@/components/store/price";
import type { VariantDiscount } from "@/domain/variant-options";

export function BuyBox({
  skuId,
  originalCentavos,
  discountedCentavos,
  savedCentavos,
  discounts,
  soldOut,
}: {
  skuId: string;
  originalCentavos: number;
  discountedCentavos: number;
  savedCentavos: number;
  discounts?: VariantDiscount[];
  soldOut: boolean;
}) {
  const [quantity, setQuantity] = useState(1);
  return (
    // Price and its own buy actions are one visual unit — grouped in a
    // single flex item (gap-3, matching the label-to-control spacing used
    // elsewhere on the PDP) instead of being separate children of the
    // parent's gap-6 row, which used to leave as much air between the price
    // and "Add to cart" as between wholly unrelated sections. This must be
    // `flex` + `gap-3`, not `space-y-3`: Price's root element is an inline
    // `<span>`, and vertical margin (what space-y relies on) has no effect
    // on layout for inline boxes — flex gap doesn't have that gotcha.
    <div className="flex flex-col gap-3">
      <Price
        originalCentavos={originalCentavos}
        discountedCentavos={discountedCentavos}
        savedCentavos={savedCentavos}
        quantity={quantity}
        discounts={discounts}
      />
      {soldOut ? (
        <p className="text-sm text-destructive">Sold out — check back soon.</p>
      ) : (
        <div className="space-y-2">
          <AddToCartButton skuId={skuId} quantity={quantity} onQuantityChange={setQuantity} />
          <BuyNowButton skuId={skuId} quantity={quantity} />
        </div>
      )}
    </div>
  );
}
