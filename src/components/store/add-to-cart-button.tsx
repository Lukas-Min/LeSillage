"use client";

import { useState, useTransition } from "react";
import { Minus, Plus, ShoppingBag } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useCart } from "@/components/store/cart-context";

/**
 * Every remaining call site (PDP buy boxes, the wishlist page) always has a
 * real skuId already picked, so this is just the quantity stepper + add
 * action — no "no size picked yet" guard, and no `soldOut` prop: the two PDP
 * buy boxes already gate rendering this component behind their own
 * `soldOut`/`selected.soldOut` check (showing a "Sold out" message instead
 * of mounting this at all), so this never needs to know. That guard (plus a
 * "compact", size-picker-less variant for the shop-grid card) used to live
 * here only for ProductCard, which no longer adds to cart directly — see
 * product-card.tsx.
 */
export function AddToCartButton({
  skuId,
  quantity,
  onQuantityChange,
}: {
  skuId: string;
  quantity?: number;
  onQuantityChange?: (quantity: number) => void;
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

  const add = (quantity: number) =>
    startTransition(async () => {
      try {
        await cart.add({ skuId, quantity });
        toast.success("Added to bag", { id: "cart-add" });
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Could not add to bag", { id: "cart-add" });
      }
    });

  const decrement = () => setQty((value) => Math.max(1, value - 1));
  const increment = () => setQty((value) => Math.min(99, value + 1));
  return (
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
        disabled={isPending}
        aria-busy={isPending}
        onClick={() => add(qty)}
      >
        <ShoppingBag className="h-4 w-4" />
        {isPending ? "Adding…" : "Add to cart"}
      </Button>
    </div>
  );
}
