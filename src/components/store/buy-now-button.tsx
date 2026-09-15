"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

/**
 * Deliberately does not touch the cart in any way (no useCart, no server
 * action) — it just routes straight to checkout for exactly this SKU and
 * quantity. The cart keeps whatever it already had, untouched.
 *
 * Every remaining call site (PDP buy boxes) always has a real skuId already
 * picked — the "no size picked yet" guard, custom className, and `soldOut`
 * prop (the two PDP buy boxes already gate rendering this behind their own
 * sold-out check, so this never needs to know) used to live here only for
 * ProductCard, which no longer buys directly; see product-card.tsx.
 */
export function BuyNowButton({
  skuId,
  quantity,
}: {
  skuId: string;
  quantity: number;
}) {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);

  return (
    <Button
      type="button"
      variant="outline"
      size="lg"
      className="h-11 w-full rounded-md"
      disabled={isPending}
      aria-busy={isPending}
      onClick={() => {
        setIsPending(true);
        router.push(`/checkout?buyNow=${encodeURIComponent(skuId)}:${quantity}`);
      }}
    >
      {isPending ? "Redirecting…" : "Buy now"}
    </Button>
  );
}
