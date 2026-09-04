"use client";

import { useState } from "react";
import { AddToCartButton } from "@/components/store/add-to-cart-button";
import { BuyNowButton } from "@/components/store/buy-now-button";
import { Price } from "@/components/store/price";

export function BuyBox({
  skuId,
  originalCentavos,
  discountedCentavos,
  savedCentavos,
  soldOut,
}: {
  skuId: string;
  originalCentavos: number;
  discountedCentavos: number;
  savedCentavos: number;
  soldOut: boolean;
}) {
  const [quantity, setQuantity] = useState(1);
  return (
    <>
      <Price
        originalCentavos={originalCentavos}
        discountedCentavos={discountedCentavos}
        savedCentavos={savedCentavos}
        quantity={quantity}
      />
      {soldOut ? (
        <p className="text-sm text-destructive">Sold out — check back soon.</p>
      ) : (
        <div className="space-y-2">
          <AddToCartButton skuId={skuId} quantity={quantity} onQuantityChange={setQuantity} />
          <BuyNowButton skuId={skuId} quantity={quantity} />
        </div>
      )}
    </>
  );
}
