"use client";

import { useState, useTransition } from "react";
import { ShoppingBag } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useCart } from "@/components/store/cart-context";
import { QuantityStepper } from "@/components/store/quantity-stepper";
import { cn } from "@/lib/utils";

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
  hideStepper = false,
}: {
  skuId: string;
  quantity?: number;
  onQuantityChange?: (quantity: number) => void;
  /** The two PDP buy boxes lay the stepper out on its own row, next to "Buy
   *  now" as a matched pair of equal-width buttons, instead of cramming it
   *  into this button's own row — a stepper stealing space from only one
   *  side of that pair left "Add to cart" visibly narrower than "Buy now".
   *  `quantity` must be a controlled prop when this is set, since there's no
   *  stepper here to drive the internal fallback. */
  hideStepper?: boolean;
}) {
  const cart = useCart();
  const [isPending, startTransition] = useTransition();
  const [internalQty, setInternalQty] = useState(1);
  const qty = quantity ?? internalQty;
  const setQty = (next: number) => {
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

  const addButton = (
    <Button
      type="button"
      variant="gold"
      size="lg"
      className={cn("h-11 rounded-md", hideStepper ? "w-full" : "flex-1")}
      disabled={isPending}
      aria-busy={isPending}
      onClick={() => add(qty)}
    >
      <ShoppingBag className="h-4 w-4" />
      {isPending ? "Adding…" : "Add to cart"}
    </Button>
  );

  if (hideStepper) return addButton;

  return (
    <div className="flex items-center gap-2">
      <QuantityStepper quantity={qty} onChange={setQty} />
      {addButton}
    </div>
  );
}
