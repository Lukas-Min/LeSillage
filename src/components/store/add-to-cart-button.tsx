"use client";

import { useState, useTransition } from "react";
import { Minus, Plus, ShoppingBag } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useCart } from "@/components/store/cart-context";

export function AddToCartButton({ skuId }: { skuId: string }) {
  const cart = useCart();
  const [isPending, startTransition] = useTransition();
  const [qty, setQty] = useState(1);
  const decrement = () => setQty((value) => Math.max(1, value - 1));
  const increment = () => setQty((value) => Math.min(99, value + 1));
  return (
    <div className="flex flex-1 items-center gap-2">
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
        size="lg"
        className="h-11 flex-1 bg-gold text-gold-foreground hover:bg-gold/90"
        disabled={isPending}
        aria-busy={isPending}
        onClick={() =>
          startTransition(async () => {
            try {
              await cart.add({ skuId, quantity: qty });
              toast.success("Added to bag");
            } catch (error) {
              toast.error(error instanceof Error ? error.message : "Could not add to bag");
            }
          })
        }
      >
        <ShoppingBag className="h-4 w-4" />
        {isPending ? "Adding…" : "Add to bag"}
      </Button>
    </div>
  );
}
