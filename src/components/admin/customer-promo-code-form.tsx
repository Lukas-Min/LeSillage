"use client";

import { useActionState } from "react";
import { createPromoCode, type PromoCodeFormState } from "@/actions/admin-promo-code-actions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/ui/submit-button";

const initial: PromoCodeFormState = { savedAt: 0, error: null };

export function CustomerPromoCodeForm({ userId }: { userId: string }) {
  const [state, action] = useActionState(createPromoCode, initial);

  return (
    <form action={action} className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      <input type="hidden" name="restrictedUserId" value={userId} />
      <input type="hidden" name="type" value="PERCENTAGE" />
      <input type="hidden" name="scope" value="ORDER" />
      <input type="hidden" name="onePerCustomer" value="on" />
      <div className="space-y-1">
        <Label htmlFor="customer-promo-code">Code</Label>
        <Input id="customer-promo-code" name="code" required minLength={3} maxLength={40} className="font-price-display uppercase" placeholder="BUDOLPROMAX15" />
      </div>
      <div className="space-y-1">
        <Label htmlFor="customer-promo-amount">Discount %</Label>
        <Input id="customer-promo-amount" name="amount" type="number" min={1} max={100} defaultValue={15} required />
      </div>
      <div className="space-y-1">
        <Label htmlFor="customer-promo-cap">Redemptions</Label>
        <Input id="customer-promo-cap" name="maxRedemptions" type="number" min={1} defaultValue={1} required />
      </div>
      <label className="flex min-h-11 items-center gap-2 text-sm sm:col-span-3">
        <input type="checkbox" name="sendEmail" className="size-4" />
        Email this customer their code
      </label>
      {state.error ? <p className="text-sm text-destructive sm:col-span-3">{state.error}</p> : null}
      <div className="flex justify-end sm:col-span-3">
        <SubmitButton className="h-11 w-full sm:w-auto">Save</SubmitButton>
      </div>
    </form>
  );
}
