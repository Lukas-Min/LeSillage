"use client";

import { useActionState, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/ui/submit-button";
import { updateSiteWideDiscount, type SiteWideDiscountFormState } from "@/actions/admin-actions";

const selectClass = "h-11 w-full rounded-lg border bg-background px-3 text-sm";

/** Already in display units: `amount` in pesos for FIXED, a plain percent for
 *  PERCENTAGE; dates as the yyyy-mm-dd an `<input type="date">` wants. */
export interface SiteWideDiscountFormValues {
  enabled: boolean;
  type: "PERCENTAGE" | "FIXED";
  amount: number;
  startsAt: string;
  endsAt: string;
}

/** A client island only so a rejected save reports why next to the fields
 *  and keeps what the admin typed — the page around it stays a Server Component. */
export function SiteWideDiscountForm({ values }: { values: SiteWideDiscountFormValues }) {
  const [state, formAction] = useActionState<SiteWideDiscountFormState, FormData>(updateSiteWideDiscount, {
    savedAt: 0,
    error: null,
  });
  const [type, setType] = useState(values.type);
  // Switching Percentage <-> Fixed would re-read the same number in the other
  // unit (10% becoming ₱10), so the amount is cleared rather than reinterpreted.
  const [amount, setAmount] = useState(String(values.amount));

  function changeType(next: "PERCENTAGE" | "FIXED") {
    setType(next);
    setAmount(next === values.type ? String(values.amount) : "");
  }

  const wasSaved = state.savedAt > 0 && !state.error;

  return (
    <form action={formAction} className="space-y-3">
      <label className="flex min-h-11 items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="enabled"
          defaultChecked={values.enabled}
          aria-describedby="siteWideDiscountHelp"
          className="size-4"
        />
        On (applies to every fragrance)
      </label>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label htmlFor="siteWideDiscountType">Type</Label>
          <select
            id="siteWideDiscountType"
            name="type"
            value={type}
            onChange={(event) => changeType(event.target.value as "PERCENTAGE" | "FIXED")}
            className={selectClass}
          >
            <option value="PERCENTAGE">Percentage</option>
            <option value="FIXED">Fixed ₱ off</option>
          </select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="siteWideDiscountAmount">{type === "PERCENTAGE" ? "Amount (%)" : "Amount (₱)"}</Label>
          <Input
            id="siteWideDiscountAmount"
            name="amount"
            type="number"
            step={type === "PERCENTAGE" ? 1 : 0.01}
            min={0}
            max={type === "PERCENTAGE" ? 100 : undefined}
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="siteWideDiscountStartsAt">Starts (optional)</Label>
          <Input id="siteWideDiscountStartsAt" name="startsAt" type="date" defaultValue={values.startsAt} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="siteWideDiscountEndsAt">Ends (optional)</Label>
          <Input id="siteWideDiscountEndsAt" name="endsAt" type="date" defaultValue={values.endsAt} />
        </div>
      </div>
      <p id="siteWideDiscountHelp" className="text-xs text-muted-foreground">
        Competes with each product&apos;s own discount — whichever saves the customer more wins, they never stack. No
        start date means it starts as soon as it&apos;s on; no end date means it doesn&apos;t expire. Dates are Manila
        days, and the end date is the last full day of the sale. Turning it on emails everyone subscribed to news and
        promotions once; saving it again while it&apos;s on doesn&apos;t.
      </p>
      {state.error ? (
        <p role="alert" className="text-xs text-destructive">
          {state.error}
        </p>
      ) : null}
      {/* Always on the page, so a screen reader announces each new save; the
          key makes a second identical "Saved." still count as a change. */}
      <p role="status" className="min-h-4 text-xs text-muted-foreground">
        {wasSaved ? (
          <span key={state.savedAt}>
            {state.announcedTo
              ? `Saved. Emailing ${state.announcedTo} subscriber${state.announcedTo === 1 ? "" : "s"} about the sale.`
              : "Saved."}
          </span>
        ) : null}
      </p>
      <SubmitButton pendingLabel="Saving…">Save</SubmitButton>
    </form>
  );
}
