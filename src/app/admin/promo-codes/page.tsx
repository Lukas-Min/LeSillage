import { desc } from "drizzle-orm";
import { db } from "@/db/client";
import { promoCodes } from "@/db/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/ui/submit-button";
import { ConfirmSubmitButton } from "@/components/ui/confirm-submit-button";
import { formatPHP } from "@/domain/money";
import { createPromoCode, deletePromoCode, togglePromoCodeActive } from "@/actions/admin-promo-code-actions";

export const dynamic = "force-dynamic";

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
    <div className={`space-y-1 ${className ?? ""}`}>
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
    </div>
  );
}

const selectClass = "h-11 w-full rounded-lg border bg-background px-3 text-sm";

function amountLabel(type: "PERCENTAGE" | "FIXED", amount: number) {
  return type === "PERCENTAGE" ? `${amount}%` : formatPHP(amount);
}

export default async function PromoCodesPage() {
  const codes = await db().select().from(promoCodes).orderBy(desc(promoCodes.createdAt));

  return (
    <div className="space-y-4">
      <h1 className="font-serif-display text-2xl">Promo codes</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Existing codes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {codes.length === 0 ? (
            <p className="text-muted-foreground">No promo codes yet.</p>
          ) : (
            codes.map((code) => (
              <div
                key={code.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3"
              >
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
                <option value="FIXED">Fixed centavos</option>
              </select>
            </Field>
            <Field label="Amount" htmlFor="amount">
              <Input id="amount" name="amount" type="number" required min={1} />
            </Field>
            <Field label="Minimum spend (centavos, optional)" htmlFor="minSpendCentavos">
              <Input id="minSpendCentavos" name="minSpendCentavos" type="number" min={0} placeholder="e.g. 200000 for ₱2,000" />
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
            <div className="sm:col-span-2">
              <SubmitButton>Create code</SubmitButton>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
