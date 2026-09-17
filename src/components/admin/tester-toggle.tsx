"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { setSkuTester } from "@/actions/admin-catalog-actions";

/**
 * The "Free tester" checkbox on an existing decant SKU, saving the moment it
 * is toggled — flagging a tester is a one-field change and shouldn't need the
 * whole SKU form re-posted. It stays inside that form under the same `name`
 * so a later "Save SKU" submits the value it already shows instead of
 * silently reverting it. Optimistic: the box flips at once and flips back
 * (with the error) if the save fails.
 */
export function TesterToggle({ skuId, initialChecked }: { skuId: string; initialChecked: boolean }) {
  const [checked, setChecked] = useState(initialChecked);
  const [isPending, startTransition] = useTransition();

  const toggle = (next: boolean) => {
    if (isPending) return;
    const previous = checked;
    setChecked(next);
    startTransition(async () => {
      const result = await setSkuTester({ skuId, isTester: next });
      if (!result.ok) {
        setChecked(previous);
        toast.error(result.error);
        return;
      }
      toast.success(next ? "Added to the free-tester pool" : "Removed from the free-tester pool");
    });
  };

  return (
    <label className="flex items-center gap-2 text-xs">
      {/* Not `disabled` while saving: a disabled checkbox is dropped from a
          form post, and the parent "Save SKU" must always see this value. */}
      <input
        type="checkbox"
        name="isTester"
        checked={checked}
        onChange={(event) => toggle(event.target.checked)}
        aria-busy={isPending}
      />
      Free tester{" "}
      <span className="font-normal text-muted-foreground">
        (saves instantly · still sold in the shop, also handed out free with ₱2,000 of decants)
      </span>
    </label>
  );
}
