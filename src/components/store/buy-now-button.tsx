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
  onRequireSelection,
  hideRequireSelectionMessage = false,
}: {
  skuId: string;
  quantity: number;
  soldOut?: boolean;
  /** No size picked yet — button stays clickable, clicking shows an inline message instead of navigating. */
  disabled?: boolean;
  requireSelectionMessage?: string;
  className?: string;
  /** Called on a blocked click (no size picked yet) in addition to this
   *  button's own local state — lets a caller with a sibling button (e.g.
   *  Add to cart next to Buy now) show one shared message instead of each
   *  button showing its own. */
  onRequireSelection?: () => void;
  /** Suppress this button's own inline message — for a caller that renders
   *  one shared message itself, driven by onRequireSelection above. */
  hideRequireSelectionMessage?: boolean;
}) {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const [attempted, setAttempted] = useState(false);
  const showRequireSelection = !hideRequireSelectionMessage && attempted && disabled;

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
            onRequireSelection?.();
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
