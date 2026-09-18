"use client";

import { Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Extracted out of AddToCartButton so a PDP buy box can lay the stepper out
 * separately from the "Add to cart" button itself (see add-to-cart-button.tsx's
 * `hideStepper`) instead of the two being forced into one flex row together.
 */
export function QuantityStepper({
  quantity,
  onChange,
  max = 99,
  className,
}: {
  quantity: number;
  onChange: (quantity: number) => void;
  max?: number;
  className?: string;
}) {
  return (
    <div className={cn("flex h-11 w-fit items-center rounded-md border border-border", className)}>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label="Decrease quantity"
        className="h-11 w-10 rounded-none rounded-l-md"
        onClick={() => onChange(Math.max(1, quantity - 1))}
        disabled={quantity <= 1}
      >
        <Minus className="h-4 w-4" />
      </Button>
      <span
        aria-live="polite"
        aria-label={`Quantity ${quantity}`}
        className="flex h-11 min-w-12 items-center justify-center px-2 text-sm font-medium tabular-nums"
      >
        {quantity}
      </span>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label="Increase quantity"
        className="h-11 w-10 rounded-none rounded-r-md"
        onClick={() => onChange(Math.min(max, quantity + 1))}
      >
        <Plus className="h-4 w-4" />
      </Button>
    </div>
  );
}
