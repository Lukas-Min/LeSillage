"use client";

import { useState } from "react";
import { AddToCartButton } from "@/components/store/add-to-cart-button";
import { BuyNowButton } from "@/components/store/buy-now-button";
import { Price } from "@/components/store/price";
import { QuantityStepper } from "@/components/store/quantity-stepper";
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
        <div className="flex flex-col gap-3">
          <QuantityStepper quantity={quantity} onChange={setQuantity} />
          {/* "Add to cart" and "Buy now" as a matched, equal-width pair —
              the stepper used to sit inside this same row on one side only,
              which made "Add to cart" read as the smaller, weaker button
              even though it's the primary action. */}
          <div className="flex gap-2">
            <div className="flex-1">
              <AddToCartButton skuId={skuId} quantity={quantity} hideStepper />
            </div>
            <div className="flex-1">
              <BuyNowButton skuId={skuId} quantity={quantity} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
