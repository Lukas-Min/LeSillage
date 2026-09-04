"use client";

import { useState, useTransition } from "react";
import { Minus, Plus, ShoppingBag } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useCart } from "@/components/store/cart-context";

export function AddToCartButton({
  skuId,
  variant = "full",
  soldOut = false,
  disabled = false,
  requireSelectionMessage = "Please select a size",
  quantity,
  onQuantityChange,
  onRequireSelection,
  hideRequireSelectionMessage = false,
}: {
  skuId: string;
  variant?: "full" | "compact";
  soldOut?: boolean;
  /** No size picked yet — button stays clickable and labeled "Add to cart"; clicking shows an inline message instead of adding. */
  disabled?: boolean;
  requireSelectionMessage?: string;
  quantity?: number;
  onQuantityChange?: (quantity: number) => void;
  /** Called on a blocked click (no size picked yet) in addition to this
   *  button's own local state — lets a caller with a sibling button (e.g.
   *  Buy Now next to Add to cart) show one shared message instead of each
   *  button showing its own. */
  onRequireSelection?: () => void;
  /** Suppress this button's own inline message — for a caller that renders
   *  one shared message itself, driven by onRequireSelection above. */
  hideRequireSelectionMessage?: boolean;
}) {
  const cart = useCart();
  const [isPending, startTransition] = useTransition();
  const [internalQty, setInternalQty] = useState(1);
  const qty = quantity ?? internalQty;
  const setQty = (updater: (value: number) => number) => {
    const next = updater(qty);
    if (onQuantityChange) onQuantityChange(next);
    else setInternalQty(next);
  };

  // Clicking without a size picked shows an inline message next to the
  // button — same convention as the auth forms' field-level errors — rather
  // than a toast. It clears itself the moment `disabled` turns false (a size
  // gets picked); no effect needed, `attempted && disabled` already goes
  // false on its own once that happens.
  const [attempted, setAttempted] = useState(false);
  const showRequireSelection = !hideRequireSelectionMessage && attempted && disabled;

  const add = (quantity: number) =>
    startTransition(async () => {
      try {
        await cart.add({ skuId, quantity });
        toast.success("Added to bag", { id: "cart-add" });
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Could not add to bag", { id: "cart-add" });
      }
    });

  if (variant === "compact") {
    return (
      <div>
        <Button
          type="button"
          variant="gold"
          size="lg"
          className="h-11 w-full rounded-md"
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
            add(1);
          }}
        >
          {soldOut ? "Sold out" : isPending ? "Adding…" : "Add to cart"}
        </Button>
        {showRequireSelection ? (
          <p className="mt-1 text-xs text-destructive">{requireSelectionMessage}</p>
        ) : null}
      </div>
    );
  }

  const decrement = () => setQty((value) => Math.max(1, value - 1));
  const increment = () => setQty((value) => Math.min(99, value + 1));
  return (
    <div>
      <div className="flex items-center gap-2">
        <div className="flex items-center rounded-md border border-border">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Decrease quantity"
            className="h-11 w-10 rounded-none rounded-l-md"
            onClick={decrement}
            disabled={qty <= 1}
          >
            <Minus className="h-4 w-4" />
          </Button>
          <span
            aria-live="polite"
            aria-label={`Quantity ${qty}`}
            className="flex h-11 min-w-12 items-center justify-center px-2 text-sm font-medium tabular-nums"
          >
            {qty}
          </span>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Increase quantity"
            className="h-11 w-10 rounded-none rounded-r-md"
            onClick={increment}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        <Button
          type="button"
          variant="gold"
          size="lg"
          className="h-11 flex-1 rounded-md"
          disabled={isPending || soldOut}
          aria-busy={isPending}
          onClick={() => {
            if (soldOut) return;
            if (disabled || !skuId) {
              setAttempted(true);
              onRequireSelection?.();
              return;
            }
            add(qty);
          }}
        >
          <ShoppingBag className="h-4 w-4" />
          {soldOut ? "Sold out" : isPending ? "Adding…" : "Add to cart"}
        </Button>
      </div>
      {showRequireSelection ? (
        <p className="mt-1 text-xs text-destructive">{requireSelectionMessage}</p>
      ) : null}
    </div>
  );
}
