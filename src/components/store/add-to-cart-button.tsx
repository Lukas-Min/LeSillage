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
}: {
  skuId: string;
  variant?: "full" | "compact";
  soldOut?: boolean;
}) {
  const cart = useCart();
  const [isPending, startTransition] = useTransition();
  const [qty, setQty] = useState(1);
  const add = (quantity: number) =>
    startTransition(async () => {
      try {
        await cart.add({ skuId, quantity });
        toast.success("Added to bag");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Could not add to bag");
      }
    });

  if (variant === "compact") {
    return (
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
          if (!soldOut) add(1);
        }}
      >
        {soldOut ? "Sold out" : isPending ? "Adding…" : "Add"}
      </Button>
    );
  }

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
        variant="gold"
        size="lg"
        className="h-11 flex-1 rounded-md"
        disabled={isPending || soldOut}
        aria-busy={isPending}
        onClick={() => add(qty)}
      >
        <ShoppingBag className="h-4 w-4" />
        {soldOut ? "Sold out" : isPending ? "Adding…" : "Add to bag"}
      </Button>
    </div>
  );
}
