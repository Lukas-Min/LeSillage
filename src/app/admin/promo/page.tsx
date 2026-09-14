import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { promoSettings, promoCodes } from "@/db/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/ui/submit-button";
import { ConfirmSubmitButton } from "@/components/ui/confirm-submit-button";
import { updatePromoSettings } from "@/actions/admin-actions";
import {
  createPromoCode,
  deletePromoCode,
  togglePromoCodeActive,
  updatePromoCode,
} from "@/actions/admin-promo-code-actions";
import { fromCentavos, formatPHP } from "@/domain/money";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const TABS = [
  { value: "settings", label: "Settings" },
  { value: "codes", label: "Promo codes" },
] as const;

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

const selectClass = "h-11 w-full rounded-lg border bg-background px-3 text-sm";

function amountLabel(type: "PERCENTAGE" | "FIXED", amount: number) {
  return type === "PERCENTAGE" ? `${amount}%` : formatPHP(amount);
}

/** `<input type="date">` wants yyyy-mm-dd; parseDate in the action turns that
 *  back into a Date, so a code edited here round-trips to the day it shows. */
function toDateInput(value: Date | null) {
  return value ? value.toISOString().slice(0, 10) : "";
}

export default async function PromoAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab: tabParam } = await searchParams;
  const activeTab = tabParam === "codes" ? "codes" : "settings";

  const [row, codes] = await Promise.all([
    db().select().from(promoSettings).where(eq(promoSettings.id, "singleton")).then((rows) => rows[0]),
    db().select().from(promoCodes).orderBy(desc(promoCodes.createdAt)),
  ]);

  return (
    <div className="space-y-4">
      <h1 className="font-serif-display text-2xl">Promo & delivery</h1>
      <div className="flex flex-wrap items-center gap-1 border-b border-border">
        {TABS.map((tab) => (
          <Link
            key={tab.value}
            href={tab.value === "settings" ? "/admin/promo" : `/admin/promo?tab=${tab.value}`}
            className={cn(
              "min-h-11 border-b-2 px-3 py-2 text-xs uppercase tracking-[0.15em] transition-colors",
              activeTab === tab.value
                ? "border-gold text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      {activeTab === "settings" ? (
        <Card>
          <CardContent className="p-4">
            <form action={updatePromoSettings} className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor="decantThresholdCentavos">Free-shipping threshold (₱)</Label>
                <Input
                  id="decantThresholdCentavos"
                  name="decantThresholdCentavos"
                  type="number"
                  step="0.01"
                  defaultValue={fromCentavos(row?.decantThresholdCentavos ?? 200000)}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="deliveryFeeCentavos">Delivery fee (₱)</Label>
                <Input
                  id="deliveryFeeCentavos"
                  name="deliveryFeeCentavos"
                  type="number"
                  step="0.01"
                  defaultValue={fromCentavos(row?.deliveryFeeCentavos ?? 12000)}
                />
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  name="freeDeliveryEnabled"
                  defaultChecked={row?.freeDeliveryEnabled ?? true}
                />
                Free shipping enabled
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  name="testerBonusEnabled"
                  defaultChecked={row?.testerBonusEnabled ?? true}
                />
                Tester bonus enabled
              </label>
              <p className="text-xs text-muted-foreground">
                On a delivered order over the decant threshold, assigns one in-stock SKU marked Tester. Those SKUs stay
                listed in the shop. Pickup never receives a complimentary tester.
              </p>
              <div className="space-y-1">
                <Label htmlFor="decantPreOrderThresholdMl">Decant pre-order threshold (ml)</Label>
                <Input
                  id="decantPreOrderThresholdMl"
                  name="decantPreOrderThresholdMl"
                  type="number"
                  defaultValue={row?.decantPreOrderThresholdMl ?? 10}
                />
                <p className="text-xs text-muted-foreground">
                  When remaining ml on an In-house decant drops below this, every In-house size on that fragrance
                  becomes pre-order. Retail decants ignore this pool and use their own stock.
                </p>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  name="siteWideDiscountEnabled"
                  defaultChecked={row?.siteWideDiscountEnabled ?? false}
                />
                Site-wide discount enabled (applies to every fragrance)
              </label>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="siteWideDiscountType">Type</Label>
                  <select
                    id="siteWideDiscountType"
                    name="siteWideDiscountType"
                    defaultValue={row?.siteWideDiscountType ?? "PERCENTAGE"}
                    className={selectClass}
                  >
                    <option value="PERCENTAGE">Percentage</option>
                    <option value="FIXED">Fixed ₱ off</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="siteWideDiscountAmount">Amount (% or ₱)</Label>
                  <Input
                    id="siteWideDiscountAmount"
                    name="siteWideDiscountAmount"
                    type="number"
                    step="0.01"
                    min={0}
                    defaultValue={
                      row?.siteWideDiscountType === "FIXED"
                        ? fromCentavos(row?.siteWideDiscountAmount ?? 0)
                        : row?.siteWideDiscountAmount ?? 0
                    }
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Competes with each product&apos;s own discount — whichever saves the customer more wins, they never stack.
                Free-shipping threshold, delivery fee, and a Fixed discount amount are entered in pesos (add a period
                for centavos) — not centavos.
              </p>
              <Button type="submit">Save</Button>
            </form>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Existing codes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {codes.length === 0 ? (
                <p className="text-muted-foreground">No promo codes yet.</p>
              ) : (
                codes.map((code) => (
                  <div key={code.id} className="space-y-3 rounded-lg border p-3">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="space-y-1">
                        <p className="font-mono font-medium">{code.code}</p>
                        <p className="text-xs text-muted-foreground">
                          {amountLabel(code.type, code.amount)} off {code.scope === "ORDER" ? "order" : "delivery"}
                          {code.minSpendCentavos ? ` · min spend ${formatPHP(code.minSpendCentavos)}` : ""}
                          {code.firstOrderOnly ? " · first order only" : ""}
                          {code.onePerCustomer ? " · once per customer" : ""}
                          {code.maxRedemptions ? ` · ${code.redemptionCount}/${code.maxRedemptions} used` : ` · ${code.redemptionCount} used`}
                          {code.startsAt ? ` · starts ${code.startsAt.toLocaleDateString()}` : ""}
                          {code.endsAt ? ` · ends ${code.endsAt.toLocaleDateString()}` : ""}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <form action={togglePromoCodeActive}>
                          <input type="hidden" name="id" value={code.id} />
                          <input type="hidden" name="isActive" value={(!code.isActive).toString()} />
                          <SubmitButton variant="outline">{code.isActive ? "Deactivate" : "Activate"}</SubmitButton>
                        </form>
                        {code.redemptionCount === 0 ? (
                          <>
                            <form id={`delete-promo-${code.id}`} action={deletePromoCode}>
                              <input type="hidden" name="id" value={code.id} />
                            </form>
                            <ConfirmSubmitButton
                              formId={`delete-promo-${code.id}`}
                              title="Delete this promo code?"
                              description={`"${code.code}" has never been redeemed, so this is safe to remove permanently.`}
                              triggerLabel="Delete"
                            />
                          </>
                        ) : null}
                      </div>
                    </div>
                    {/* Collapsed by default so a long list stays scannable on a
                        phone; a plain <details> keeps this a Server Component. */}
                    <details className="rounded-md border bg-secondary/40 p-3">
                      <summary className="flex min-h-11 cursor-pointer items-center text-sm font-medium">
                        Edit <span className="ml-1 font-mono">{code.code}</span>
                      </summary>
                      <form action={updatePromoCode} className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <input type="hidden" name="id" value={code.id} />
                        {/* What the form prefilled, so the action can tell an untouched
                            field from a real edit — it keeps a date's stored time-of-day
                            and rejects a type switch that left the amount in the old unit. */}
                        <input type="hidden" name="previousType" value={code.type} />
                        <input
                          type="hidden"
                          name="previousAmount"
                          value={code.type === "FIXED" ? fromCentavos(code.amount) : code.amount}
                        />
                        <input type="hidden" name="previousStartsAt" value={toDateInput(code.startsAt)} />
                        <input type="hidden" name="previousEndsAt" value={toDateInput(code.endsAt)} />
                        <Field label="Code" htmlFor={`edit-code-${code.id}`}>
                          <Input
                            id={`edit-code-${code.id}`}
                            name="code"
                            defaultValue={code.code}
                            required
                            minLength={3}
                            maxLength={40}
                            className="uppercase"
                          />
                        </Field>
                        <Field label="Discounts" htmlFor={`edit-scope-${code.id}`}>
                          <select id={`edit-scope-${code.id}`} name="scope" className={selectClass} defaultValue={code.scope}>
                            <option value="ORDER">Order subtotal</option>
                            <option value="DELIVERY">Delivery fee</option>
                          </select>
                        </Field>
                        <Field label="Type" htmlFor={`edit-type-${code.id}`}>
                          <select id={`edit-type-${code.id}`} name="type" className={selectClass} defaultValue={code.type}>
                            <option value="PERCENTAGE">Percentage</option>
                            <option value="FIXED">Fixed ₱ off</option>
                          </select>
                        </Field>
                        <Field label="Amount (% or ₱)" htmlFor={`edit-amount-${code.id}`}>
                          <Input
                            id={`edit-amount-${code.id}`}
                            name="amount"
                            type="number"
                            step="0.01"
                            required
                            min={1}
                            defaultValue={code.type === "FIXED" ? fromCentavos(code.amount) : code.amount}
                          />
                        </Field>
                        <Field label="Minimum spend (₱, optional)" htmlFor={`edit-minSpend-${code.id}`}>
                          <Input
                            id={`edit-minSpend-${code.id}`}
                            name="minSpendCentavos"
                            type="number"
                            step="0.01"
                            min={0}
                            placeholder="e.g. 2000"
                            defaultValue={code.minSpendCentavos === null ? "" : fromCentavos(code.minSpendCentavos)}
                          />
                        </Field>
                        <Field label="Max redemptions (optional)" htmlFor={`edit-maxRedemptions-${code.id}`}>
                          <Input
                            id={`edit-maxRedemptions-${code.id}`}
                            name="maxRedemptions"
                            type="number"
                            min={1}
                            placeholder="Unlimited"
                            defaultValue={code.maxRedemptions ?? ""}
                          />
                        </Field>
                        <Field label="Starts (optional)" htmlFor={`edit-startsAt-${code.id}`}>
                          <Input id={`edit-startsAt-${code.id}`} name="startsAt" type="date" defaultValue={toDateInput(code.startsAt)} />
                        </Field>
                        <Field label="Ends (optional)" htmlFor={`edit-endsAt-${code.id}`}>
                          <Input id={`edit-endsAt-${code.id}`} name="endsAt" type="date" defaultValue={toDateInput(code.endsAt)} />
                        </Field>
                        <label className="flex items-center gap-2 text-sm">
                          <input type="checkbox" name="firstOrderOnly" defaultChecked={code.firstOrderOnly} />
                          First order only
                        </label>
                        <label className="flex items-center gap-2 text-sm">
                          <input type="checkbox" name="onePerCustomer" defaultChecked={code.onePerCustomer} />
                          Once per customer
                        </label>
                        <p className="text-xs text-muted-foreground sm:col-span-2">
                          Amount is a plain percent for a Percentage discount and pesos for a Fixed/₱ one; minimum spend is
                          always pesos. Active/inactive stays with the button above, and the {code.redemptionCount}{" "}
                          redemption(s) already recorded are never changed here.
                        </p>
                        <div className="sm:col-span-2">
                          <SubmitButton>Save changes</SubmitButton>
                        </div>
                      </form>
                    </details>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">New code</CardTitle>
            </CardHeader>
            <CardContent>
              <form action={createPromoCode} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field label="Code" htmlFor="code">
                  <Input id="code" name="code" placeholder="WELCOME10" required minLength={3} maxLength={40} className="uppercase" />
                </Field>
                <Field label="Discounts" htmlFor="scope">
                  <select id="scope" name="scope" className={selectClass} defaultValue="ORDER">
                    <option value="ORDER">Order subtotal</option>
                    <option value="DELIVERY">Delivery fee</option>
                  </select>
                </Field>
                <Field label="Type" htmlFor="type">
                  <select id="type" name="type" className={selectClass} defaultValue="PERCENTAGE">
                    <option value="PERCENTAGE">Percentage</option>
                    <option value="FIXED">Fixed ₱ off</option>
                  </select>
                </Field>
                <Field label="Amount (% or ₱)" htmlFor="amount">
                  <Input id="amount" name="amount" type="number" step="0.01" required min={1} />
                </Field>
                <Field label="Minimum spend (₱, optional)" htmlFor="minSpendCentavos">
                  <Input id="minSpendCentavos" name="minSpendCentavos" type="number" step="0.01" min={0} placeholder="e.g. 2000" />
                </Field>
                <Field label="Max redemptions (optional)" htmlFor="maxRedemptions">
                  <Input id="maxRedemptions" name="maxRedemptions" type="number" min={1} placeholder="Unlimited" />
                </Field>
                <Field label="Starts (optional)" htmlFor="startsAt">
                  <Input id="startsAt" name="startsAt" type="date" />
                </Field>
                <Field label="Ends (optional)" htmlFor="endsAt">
                  <Input id="endsAt" name="endsAt" type="date" />
                </Field>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" name="firstOrderOnly" />
                  First order only
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" name="onePerCustomer" />
                  Once per customer
                </label>
                <p className="text-xs text-muted-foreground sm:col-span-2">
                  Amount and minimum spend are entered in pesos for a Fixed/₱ discount (add a period for centavos) — not centavos.
                </p>
                <div className="sm:col-span-2">
                  <SubmitButton>Create code</SubmitButton>
                </div>
              </form>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
