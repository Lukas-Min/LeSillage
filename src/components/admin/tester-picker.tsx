"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { adminAssignTester } from "@/actions/admin-actions";

export interface TesterPickerOption {
  skuId: string;
  /** "Layton · 3ml" — product then SKU label, ready to display. */
  label: string;
  /** Same brand as something in the order — listed first, since that's what
   *  the auto-pick would have chosen had it been in stock. */
  matchesOrder: boolean;
  unitsAvailable: number;
}

const selectClass = "h-11 w-full rounded-lg border bg-background px-3 text-sm sm:max-w-md";

/**
 * The admin's hand pick for an order's free tester. Shown while the order is
 * awaiting confirmation or being prepared; the auto-pick may already have
 * chosen one (preselected here), or it may have found no brand match and left
 * the order PENDING — in which case Confirm stays locked until something is
 * chosen here (`confirmBlockedReason`, enforced again server-side).
 */
export function TesterPicker({
  orderId,
  options,
  currentSkuId,
}: {
  orderId: string;
  options: TesterPickerOption[];
  currentSkuId: string | null;
}) {
  const [skuId, setSkuId] = useState(currentSkuId ?? "");
  const [isPending, startTransition] = useTransition();

  const matching = options.filter((o) => o.matchesOrder);
  const others = options.filter((o) => !o.matchesOrder);

  const submit = () => {
    if (!skuId) {
      toast.error("Pick a tester first");
      return;
    }
    startTransition(async () => {
      const formData = new FormData();
      formData.set("orderId", orderId);
      formData.set("skuId", skuId);
      const result = await adminAssignTester(formData);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(currentSkuId ? "Tester changed" : "Tester assigned");
    });
  };

  const renderOption = (o: TesterPickerOption) => (
    <option
      key={o.skuId}
      value={o.skuId}
      // The current pick shows 0 left because this order is holding it.
      disabled={o.unitsAvailable === 0 && o.skuId !== currentSkuId}
    >
      {o.label} · {o.skuId === currentSkuId ? "assigned to this order" : `${o.unitsAvailable} left`}
    </option>
  );

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <select
        aria-label="Free tester"
        className={selectClass}
        value={skuId}
        onChange={(event) => setSkuId(event.target.value)}
        disabled={isPending}
      >
        <option value="" disabled>
          Choose a tester…
        </option>
        {matching.length > 0 ? <optgroup label="Matches this order's brands">{matching.map(renderOption)}</optgroup> : null}
        {others.length > 0 ? (
          <optgroup label={matching.length > 0 ? "Other testers" : "Available testers"}>{others.map(renderOption)}</optgroup>
        ) : null}
      </select>
      <Button onClick={submit} disabled={isPending || !skuId || skuId === currentSkuId} aria-busy={isPending}>
        {currentSkuId ? "Change tester" : "Assign tester"}
      </Button>
    </div>
  );
}
