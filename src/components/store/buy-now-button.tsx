"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

/**
 * Deliberately does not touch the cart in any way (no useCart, no server
 * action) — it just routes straight to checkout for exactly this SKU and
 * quantity. The cart keeps whatever it already had, untouched.
 */
export function BuyNowButton({
  skuId,
  quantity,
  soldOut = false,
  disabled = false,
  requireSelectionMessage = "Please select a size",
  className,
}: {
  skuId: string;
  quantity: number;
  soldOut?: boolean;
  /** No size picked yet — button stays clickable, clicking shows an inline message instead of navigating. */
  disabled?: boolean;
  requireSelectionMessage?: string;
  className?: string;
}) {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const [attempted, setAttempted] = useState(false);
  const showRequireSelection = attempted && disabled;

  return (
    <div>
      <Button
        type="button"
        variant="outline"
        size="lg"
        className={className ?? "h-11 w-full rounded-md"}
        disabled={isPending || soldOut}
        aria-busy={isPending}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          if (soldOut) return;
          if (disabled || !skuId) {
            setAttempted(true);
            return;
          }
          setIsPending(true);
          router.push(`/checkout?buyNow=${encodeURIComponent(skuId)}:${quantity}`);
        }}
      >
        {soldOut ? "Sold out" : isPending ? "Redirecting…" : "Buy now"}
      </Button>
      {showRequireSelection ? <p className="mt-1 text-xs text-destructive">{requireSelectionMessage}</p> : null}
    </div>
  );
}
