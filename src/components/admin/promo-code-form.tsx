"use client";

import { useActionState, useEffect, useId, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SubmitButton } from "@/components/ui/submit-button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageColumns } from "@/components/ui/page-layout";
import { cn } from "@/lib/utils";
import { CustomerMultiSelect, type CustomerOption } from "@/components/admin/customer-multi-select";
import type { PromoCodeFormState } from "@/actions/admin-promo-code-actions";
import type { ProductType } from "@/db/schema";
import { FORM_ACTION_CLASS } from "@/components/ui/form-action";

const selectClass = "h-11 w-full rounded-lg border bg-background px-3 text-base md:text-sm";

// The per-type amount fields, in the order the shop lists its shelves.
const TYPE_FIELDS: ReadonlyArray<{ type: ProductType; label: string }> = [
  { type: "DECANT", label: "Decants" },
  { type: "PARTIAL", label: "Partials" },
  { type: "FULL_BOTTLE", label: "Full bottles" },
];

type TypeAmountInputs = Record<ProductType, string>;
type AmountMode = "SAME" | "PER_TYPE";

function typeAmountInputs(values: Partial<Record<ProductType, number | "">>): TypeAmountInputs {
  const text = (type: ProductType) => String(values[type] ?? "");
  return { DECANT: text("DECANT"), PARTIAL: text("PARTIAL"), FULL_BOTTLE: text("FULL_BOTTLE") };
}

/** Everything the form needs, already converted to what the inputs display:
 *  `amount`/`minSpend` in pesos for a FIXED code and plain numbers for a
 *  PERCENTAGE one, dates as the yyyy-mm-dd an `<input type="date">` wants. */
export interface PromoCodeFormValues {
  id: string;
  code: string;
  scope: "ORDER" | "DELIVERY";
  type: "PERCENTAGE" | "FIXED";
  amount: number | "";
  /** One amount for every item, or a different one per product type (order codes only). */
  amountMode: AmountMode;
  /** What each product type gets, in the same unit as `amount` — for a
   *  PER_TYPE code; 0 means that type isn't discounted. */
  typeAmounts: Record<ProductType, number | "">;
  minSpend: number | "";
  maxRedemptions: number | "";
  startsAt: string;
  endsAt: string;
  firstOrderOnly: boolean;
  onePerCustomer: boolean;
  redemptionCount: number;
  /** Customers who can use the code; empty means every customer. */
  allowedUserIds: string[];
  description: string;
}

const BLANK: PromoCodeFormValues = {
  id: "",
  code: "",
  scope: "ORDER",
  type: "PERCENTAGE",
  amount: "",
  amountMode: "SAME",
  typeAmounts: { DECANT: "", PARTIAL: "", FULL_BOTTLE: "" },
  minSpend: "",
  maxRedemptions: "",
  startsAt: "",
  endsAt: "",
  firstOrderOnly: false,
  onePerCustomer: false,
  redemptionCount: 0,
  allowedUserIds: [],
  description: "",
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
  customers,
  onSaved,
}: {
  action: (prev: PromoCodeFormState, formData: FormData) => Promise<PromoCodeFormState>;
  mode: "create" | "edit";
  values?: PromoCodeFormValues;
  /** Everyone who can be added to the allowed list. */
  customers: readonly CustomerOption[];
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
  // The per-type amounts are in the same unit, so they're cleared with it.
  const [typeAmounts, setTypeAmounts] = useState(() => typeAmountInputs(values.typeAmounts));
  const [amountMode, setAmountMode] = useState<AmountMode>(values.amountMode);
  const [scope, setScope] = useState(values.scope);
  const perType = scope === "ORDER" && amountMode === "PER_TYPE";

  const wasSaved = state.savedAt > 0 && !state.error;
  // A created code joins the list above, so leave an empty form ready for the
  // next one. Adjusting state during render (rather than from an effect) is the
  // supported way to react to a change like this and avoids a second paint.
  const [handledSave, setHandledSave] = useState(state.savedAt);
  if (mode === "create" && state.savedAt !== handledSave) {
    setHandledSave(state.savedAt);
    setType("PERCENTAGE");
    setAmount("");
    setTypeAmounts(typeAmountInputs({}));
    setAmountMode("SAME");
    setScope("ORDER");
  }
  useEffect(() => {
    // Only the uncontrolled fields need the DOM reset; the controlled ones
    // are cleared above.
    if (mode === "create" && wasSaved) formRef.current?.reset();
    if (mode === "edit" && wasSaved) onSaved?.();
  }, [mode, wasSaved, state.savedAt, onSaved]);

  function changeType(next: "PERCENTAGE" | "FIXED") {
    setType(next);
    if (mode !== "edit") return;
    const back = next === values.type;
    setAmount(back && values.amount !== "" ? String(values.amount) : "");
    setTypeAmounts(typeAmountInputs(back ? values.typeAmounts : {}));
  }

  // Switching carries the numbers over: every type starts at the single
  // amount, and the single amount starts at the largest per-type one.
  function changeAmountMode(next: AmountMode) {
    setAmountMode(next);
    if (next === "PER_TYPE") {
      setTypeAmounts((current) =>
        typeAmountInputs(
          Object.fromEntries(TYPE_FIELDS.map(({ type: productType }) => [productType, current[productType] || amount])),
        ),
      );
    } else if (!amount) {
      const largest = Math.max(...TYPE_FIELDS.map(({ type: productType }) => Number(typeAmounts[productType]) || 0));
      if (largest > 0) setAmount(String(largest));
    }
  }

  const id = (name: string) => `${uid}-${name}`;

  return (
    <form ref={formRef} action={formAction} className="space-y-4">
      {mode === "edit" ? (
        <>
          <input type="hidden" name="id" value={values.id} />
          {/* What this form was prefilled with, so the action can tell an
              untouched field from a real edit: a date keeps its stored
              time-of-day, and a type switch that left the amount in the old
              unit is rejected rather than silently reinterpreted. */}
          <input type="hidden" name="previousType" value={values.type} />
          <input type="hidden" name="previousAmount" value={values.amount} />
          {TYPE_FIELDS.map(({ type: productType }) => (
            <input
              key={productType}
              type="hidden"
              name={`previousTypeAmount_${productType}`}
              value={values.amountMode === "PER_TYPE" ? values.typeAmounts[productType] : ""}
            />
          ))}
          <input type="hidden" name="previousStartsAt" value={values.startsAt} />
          <input type="hidden" name="previousEndsAt" value={values.endsAt} />
        </>
      ) : null}
      {/* Tells the action this form has the per-type fields, so a save in
          "Same" mode clears any per-type amounts the code had. */}
      <input type="hidden" name="typeAmountsField" value="1" />
      <input type="hidden" name="allowedUsersField" value="1" />

      {/* One form in two columns from xl, like the admin product page: the
          code's own fields on the left, its per-type amounts, who can use it
          and its options on the right. Below xl it's one stack in this order. */}
      <PageColumns
        main={
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Promo code</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Code" htmlFor={id("code")}>
                <Input
                  id={id("code")}
                  name="code"
                  defaultValue={values.code}
                  placeholder="WELCOME10"
                  required
                  minLength={3}
                  maxLength={40}
                  className="font-price-display uppercase"
                />
              </Field>
              <Field label="Discounts" htmlFor={id("scope")}>
                <select
                  id={id("scope")}
                  name="scope"
                  className={selectClass}
                  value={scope}
                  onChange={(event) => setScope(event.target.value as "ORDER" | "DELIVERY")}
                >
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
              {scope === "ORDER" ? (
                <Field label="Amount per product type" htmlFor={id("amountMode")}>
                  <select
                    id={id("amountMode")}
                    name="amountMode"
                    className={selectClass}
                    value={amountMode}
                    onChange={(event) => changeAmountMode(event.target.value as AmountMode)}
                    aria-describedby={perType ? id("amountModeHelp") : undefined}
                  >
                    <option value="SAME">Same for every type</option>
                    <option value="PER_TYPE">Different per type</option>
                  </select>
                  {/* The table is in the side column, so on a phone it's below
                      this card: say where the amounts went. */}
                  {perType ? (
                    <p id={id("amountModeHelp")} className="text-xs text-muted-foreground">
                      Set each amount under Per product type.
                    </p>
                  ) : null}
                </Field>
              ) : (
                <input type="hidden" name="amountMode" value="SAME" />
              )}
              {perType ? null : (
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
              )}
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
              <div className="space-y-1 sm:col-span-2">
                <Label htmlFor={id("description")}>Description (optional)</Label>
                <Textarea
                  id={id("description")}
                  name="description"
                  maxLength={500}
                  defaultValue={values.description}
                  placeholder="e.g. Thank you for being a loyal customer — enjoy this on your next order."
                  aria-describedby={id("descriptionHelp")}
                />
                <p id={id("descriptionHelp")} className="text-xs text-muted-foreground">
                  Goes in the email customers get about this code, and under the code in their Account → Promo codes.
                </p>
              </div>
              <p className="text-xs text-muted-foreground sm:col-span-2">
                Amount is a plain percent for a Percentage discount and pesos for a Fixed/₱ one; minimum spend is always
                pesos.
                {mode === "edit"
                  ? ` Active or inactive stays on the promo codes list, and the ${values.redemptionCount} redemption(s) already recorded are never changed here.`
                  : ""}
              </p>
            </CardContent>
          </Card>
        }
        side={
          <>
            {perType ? (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Per product type</CardTitle>
                </CardHeader>
                <CardContent className="space-y-1">
                  <div className="rounded-lg border">
                    <Table aria-describedby={id("typeAmountsHelp")}>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Product type</TableHead>
                          <TableHead className="w-36">{type === "PERCENTAGE" ? "Amount (%)" : "Amount (₱)"}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {TYPE_FIELDS.map(({ type: productType, label }) => (
                          <TableRow key={productType}>
                            <TableCell>
                              <Label htmlFor={id(`typeAmount_${productType}`)}>{label}</Label>
                            </TableCell>
                            <TableCell>
                              <Input
                                id={id(`typeAmount_${productType}`)}
                                name={`typeAmount_${productType}`}
                                type="number"
                                step={type === "PERCENTAGE" ? 1 : 0.01}
                                min={0}
                                max={type === "PERCENTAGE" ? 100 : undefined}
                                required
                                value={typeAmounts[productType]}
                                onChange={(event) =>
                                  setTypeAmounts((current) => ({ ...current, [productType]: event.target.value }))
                                }
                              />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  <p id={id("typeAmountsHelp")} className="text-xs text-muted-foreground">
                    0 leaves that type out. The minimum spend counts only the types with an amount.
                  </p>
                </CardContent>
              </Card>
            ) : null}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Who can use it</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1">
                <Label htmlFor={id("allowedUserIds")}>Customers who can use it</Label>
                <CustomerMultiSelect
                  id={id("allowedUserIds")}
                  name="allowedUserIds"
                  options={customers}
                  defaultSelected={values.allowedUserIds}
                  emptyLabel="Every customer"
                  describedBy={id("allowedUserIdsHelp")}
                />
                <p id={id("allowedUserIdsHelp")} className="text-xs text-muted-foreground">
                  Leave empty for every customer. Add even one and only the customers listed here can use the code.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Options</CardTitle>
              </CardHeader>
              <CardContent>
                <label className="flex min-h-11 items-center gap-2 text-sm">
                  <input type="checkbox" name="firstOrderOnly" defaultChecked={values.firstOrderOnly} className="size-4" />
                  First order only
                </label>
                <label className="flex min-h-11 items-center gap-2 text-sm">
                  <input type="checkbox" name="onePerCustomer" defaultChecked={values.onePerCustomer} className="size-4" />
                  Once per customer
                </label>
                <label className="flex min-h-11 items-center gap-2 text-sm">
                  {/* Always starts unchecked — this fires an email, it isn't a stored
                      setting, so there's nothing to prefill even when editing. */}
                  <input type="checkbox" name="sendEmail" className="size-4" aria-describedby={id("sendEmailHelp")} />
                  Email the customer(s) who can still use this code
                </label>
                <p id={id("sendEmailHelp")} className="text-xs text-muted-foreground">
                  Customers who turned off news and promotions aren&apos;t emailed. They still see the code under Account →
                  Promo codes.
                </p>
              </CardContent>
            </Card>
          </>
        }
      />

      {state.error ? (
        <p role="alert" className="text-xs text-destructive">
          {state.error}
        </p>
      ) : null}
      {wasSaved ? (
        <p role="status" className="text-xs text-muted-foreground">
          {mode === "edit" ? "Saved." : "Code created."}
        </p>
      ) : null}
      <SubmitButton pendingLabel="Saving…" className={FORM_ACTION_CLASS}>
        {mode === "edit" ? "Save changes" : "Create code"}
      </SubmitButton>
    </form>
  );
}
