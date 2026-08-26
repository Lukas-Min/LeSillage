"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useCart, type CartItem } from "@/components/store/cart-context";

export function AddToCartButton(props: Omit<CartItem, "quantity">) {
  const cart = useCart();
  const [isPending, startTransition] = useTransition();
  const [qty, setQty] = useState(1);
  return (
    <div className="flex items-center gap-2">
      <select
        aria-label="Quantity"
        className="h-10 rounded-md border bg-background px-2 text-sm"
        value={qty}
        onChange={(event) => setQty(Math.max(1, Number(event.target.value)))}
      >
        {[1, 2, 3, 4, 5].map((value) => (
          <option key={value} value={value}>
            {value}
          </option>
        ))}
      </select>
      <Button
        type="button"
        size="lg"
        disabled={isPending}
        aria-busy={isPending}
        onClick={() =>
          startTransition(async () => {
            try {
              await cart.add({ ...props, quantity: qty });
              toast.success("Added to cart");
            } catch (error) {
              toast.error(error instanceof Error ? error.message : "Could not add to cart");
            }
          })
        }
      >
        {isPending ? "Adding…" : "Add to cart"}
      </Button>
    </div>
  );
}
