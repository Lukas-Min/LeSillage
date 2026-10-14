"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { applyDiscount } from "@/domain/discount";
import { formatPHP } from "@/domain/money";

const selectClass = "h-11 w-full rounded-lg border bg-background px-3 text-base md:text-sm";

/**
 * The product discount form's Type and Amount, plus a live preview of what
 * comes off each size: its price, the price after the discount, and the
 * peso deduction, recomputed as the admin types (same math as the shop,
 * `applyDiscount`). Prefilled with the saved discount, so it also shows
 * what the current one takes off. Rendered as grid children of the form's
 * two-column grid: the two fields, then the preview across both columns.
 */
export function DiscountAmountFields({
  defaultType,
  defaultAmount,
  sizes,
}: {
  defaultType: "PERCENTAGE" | "FIXED";
  /** As typed in the box: percent, or pesos for a fixed amount. */
  defaultAmount: string;
  sizes: { id: string; label: string; retailPrice: number }[];
}) {
  const [type, setType] = useState(defaultType);
  const [amount, setAmount] = useState(defaultAmount);

  const value = Number.parseFloat(amount);
  const discount =
    Number.isFinite(value) && value > 0
      ? { type, amount: type === "FIXED" ? Math.round(value * 100) : value }
      : null;

  return (
    <>
      <div className="space-y-1">
        <Label htmlFor="new-discount-type">Type</Label>
        <select
          id="new-discount-type"
          name="type"
          value={type}
          onChange={(event) => setType(event.target.value as "PERCENTAGE" | "FIXED")}
          className={selectClass}
        >
          <option value="PERCENTAGE">Percentage</option>
          <option value="FIXED">Fixed ₱ off</option>
        </select>
      </div>
      <div className="space-y-1">
        <Label htmlFor="new-discount-amount">Amount (0 removes it)</Label>
        <Input
          id="new-discount-amount"
          name="amount"
          type="number"
          step="0.01"
          min="0"
          required
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
        />
      </div>
      <div className="col-span-2 rounded-lg border border-border bg-muted/40 p-3" aria-live="polite">
        <p className="mb-2 text-xs text-muted-foreground">
          {discount ? "What comes off each size" : "No discount: every size sells at its full price."}
        </p>
        {discount && sizes.length > 0 ? (
          <ul className="space-y-1.5">
            {sizes.map((size) => {
              const { discountedUnitCentavos, perUnitDiscountCentavos } = applyDiscount(size.retailPrice, discount);
              return (
                <li key={size.id} className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 text-sm">
                  <span className="min-w-0 text-muted-foreground">{size.label}</span>
                  <span className="tabular-nums">
                    <span className="text-muted-foreground line-through">{formatPHP(size.retailPrice)}</span>{" "}
                    <span className="font-medium">{formatPHP(discountedUnitCentavos)}</span>{" "}
                    <span className="text-destructive">−{formatPHP(perUnitDiscountCentavos)}</span>
                  </span>
                </li>
              );
            })}
          </ul>
        ) : discount ? (
          <p className="text-sm text-muted-foreground">Add a size to see the prices.</p>
        ) : null}
      </div>
    </>
  );
}
