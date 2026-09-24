"use client";

import { useActionState, useEffect, useId, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/ui/submit-button";
import { cn } from "@/lib/utils";
import type { PromoCodeFormState } from "@/actions/admin-promo-code-actions";

const selectClass = "h-11 w-full rounded-lg border bg-background px-3 text-sm";

/** Everything the form needs, already converted to what the inputs display:
 *  `amount`/`minSpend` in pesos for a FIXED code and plain numbers for a
 *  PERCENTAGE one, dates as the yyyy-mm-dd an `<input type="date">` wants. */
export interface PromoCodeFormValues {
  id: string;
  code: string;
  scope: "ORDER" | "DELIVERY";
  type: "PERCENTAGE" | "FIXED";
  amount: number | "";
  minSpend: number | "";
  maxRedemptions: number | "";
  startsAt: string;
  endsAt: string;
  firstOrderOnly: boolean;
  onePerCustomer: boolean;
  redemptionCount: number;
}

const BLANK: PromoCodeFormValues = {
  id: "",
  code: "",
  scope: "ORDER",
  type: "PERCENTAGE",
  amount: "",
  minSpend: "",
  maxRedemptions: "",
  startsAt: "",
  endsAt: "",
  firstOrderOnly: false,
  onePerCustomer: false,
  redemptionCount: 0,
};

function Field({
  label,
  htmlFor,
  className,
  children,
}: {
  label: string;
  htmlFor: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("space-y-1", className)}>
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
    </div>
  );
}

/**
 * The one promo-code form, used to create a code and to edit an existing one.
 * It's a client island purely so a rejected save can report why *next to the
 * fields* and leave everything the admin typed in place — the page around it
 * stays a Server Component.
 */
export function PromoCodeForm({
  action,
  mode,
  values = BLANK,
  onSaved,
}: {
  action: (prev: PromoCodeFormState, formData: FormData) => Promise<PromoCodeFormState>;
  mode: "create" | "edit";
  values?: PromoCodeFormValues;
  /** Fires once, right after a successful edit save — lets a modal wrapper
   *  close itself. Not used in "create" mode, which stays open for the next
   *  entry instead. */
  onSaved?: () => void;
}) {
  const [state, formAction] = useActionState(action, { savedAt: 0, error: null });
  const formRef = useRef<HTMLFormElement>(null);
  const uid = useId();
  const [type, setType] = useState(values.type);
  // Amount is the one controlled field: switching Percentage <-> Fixed re-reads
  // the same number in a different unit, so it has to be cleared and retyped
  // rather than silently reinterpreted (₱50 becoming 50% off).
  const [amount, setAmount] = useState(values.amount === "" ? "" : String(values.amount));

  const wasSaved = state.savedAt > 0 && !state.error;
  // A created code joins the list above, so leave an empty form ready for the
  // next one. Adjusting state during render (rather than from an effect) is the
  // supported way to react to a change like this and avoids a second paint.
  const [handledSave, setHandledSave] = useState(state.savedAt);
  if (mode === "create" && state.savedAt !== handledSave) {
    setHandledSave(state.savedAt);
    setType("PERCENTAGE");
    setAmount("");
  }
  useEffect(() => {
    // Only the uncontrolled fields need the DOM reset; the two controlled ones
    // are cleared above.
    if (mode === "create" && wasSaved) formRef.current?.reset();
    if (mode === "edit" && wasSaved) onSaved?.();
  }, [mode, wasSaved, state.savedAt, onSaved]);

  function changeType(next: "PERCENTAGE" | "FIXED") {
    setType(next);
    if (mode !== "edit") return;
    setAmount(next === values.type && values.amount !== "" ? String(values.amount) : "");
  }

  const id = (name: string) => `${uid}-${name}`;

  return (
    <form ref={formRef} action={formAction} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {mode === "edit" ? (
        <>
          <input type="hidden" name="id" value={values.id} />
          {/* What this form was prefilled with, so the action can tell an
              untouched field from a real edit: a date keeps its stored
              time-of-day, and a type switch that left the amount in the old
              unit is rejected rather than silently reinterpreted. */}
          <input type="hidden" name="previousType" value={values.type} />
          <input type="hidden" name="previousAmount" value={values.amount} />
          <input type="hidden" name="previousStartsAt" value={values.startsAt} />
          <input type="hidden" name="previousEndsAt" value={values.endsAt} />
        </>
      ) : null}

      <Field label="Code" htmlFor={id("code")}>
        <Input
          id={id("code")}
          name="code"
          defaultValue={values.code}
          placeholder="WELCOME10"
          required
          minLength={3}
          maxLength={40}
          className="uppercase"
        />
      </Field>
      <Field label="Discounts" htmlFor={id("scope")}>
        <select id={id("scope")} name="scope" className={selectClass} defaultValue={values.scope}>
          <option value="ORDER">Order subtotal</option>
          <option value="DELIVERY">Delivery fee</option>
        </select>
      </Field>
      <Field label="Type" htmlFor={id("type")}>
        <select
          id={id("type")}
          name="type"
          className={selectClass}
          value={type}
          onChange={(event) => changeType(event.target.value as "PERCENTAGE" | "FIXED")}
        >
          <option value="PERCENTAGE">Percentage</option>
          <option value="FIXED">Fixed ₱ off</option>
        </select>
      </Field>
      <Field label={type === "PERCENTAGE" ? "Amount (%)" : "Amount (₱)"} htmlFor={id("amount")}>
        <Input
          id={id("amount")}
          name="amount"
          type="number"
          // Percentages are stored as whole numbers, so don't let the browser
          // accept 7.5 and have the server quietly round it to 8.
          step={type === "PERCENTAGE" ? 1 : 0.01}
          min={1}
          max={type === "PERCENTAGE" ? 100 : undefined}
          required
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
        />
      </Field>
      <Field label="Minimum spend (₱, optional)" htmlFor={id("minSpend")}>
        <Input
          id={id("minSpend")}
          name="minSpendCentavos"
          type="number"
          step={0.01}
          min={0}
          placeholder="e.g. 2000"
          defaultValue={values.minSpend}
        />
      </Field>
      <Field label="Max redemptions (optional)" htmlFor={id("maxRedemptions")}>
        <Input
          id={id("maxRedemptions")}
          name="maxRedemptions"
          type="number"
          min={1}
          placeholder="Unlimited"
          defaultValue={values.maxRedemptions}
        />
      </Field>
      <Field label="Starts (optional)" htmlFor={id("startsAt")}>
        <Input id={id("startsAt")} name="startsAt" type="date" defaultValue={values.startsAt} />
      </Field>
      <Field label="Ends (optional)" htmlFor={id("endsAt")}>
        <Input id={id("endsAt")} name="endsAt" type="date" defaultValue={values.endsAt} />
      </Field>
      <label className="flex min-h-11 items-center gap-2 text-sm">
        <input type="checkbox" name="firstOrderOnly" defaultChecked={values.firstOrderOnly} className="size-4" />
        First order only
      </label>
      <label className="flex min-h-11 items-center gap-2 text-sm">
        <input type="checkbox" name="onePerCustomer" defaultChecked={values.onePerCustomer} className="size-4" />
        Once per customer
      </label>

      <p className="text-xs text-muted-foreground sm:col-span-2">
        Amount is a plain percent for a Percentage discount and pesos for a Fixed/₱ one; minimum spend is always pesos.
        {mode === "edit"
          ? ` Active/inactive stays with the button above, and the ${values.redemptionCount} redemption(s) already recorded are never changed here.`
          : ""}
      </p>
      {state.error ? (
        <p role="alert" className="text-xs text-destructive sm:col-span-2">
          {state.error}
        </p>
      ) : null}
      {wasSaved ? (
        <p role="status" className="text-xs text-muted-foreground sm:col-span-2">
          {mode === "edit" ? "Saved." : "Code created."}
        </p>
      ) : null}
      <div className="sm:col-span-2">
        <SubmitButton pendingLabel="Saving…">{mode === "edit" ? "Save changes" : "Create code"}</SubmitButton>
      </div>
    </form>
  );
}
