import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

const selectClass = "h-11 w-full rounded-lg border bg-background px-3 text-sm";

function Field({ label, htmlFor, className, children }: { label: string; htmlFor: string; className?: string; children: React.ReactNode }) {
  return (
    <div className={`space-y-1 ${className ?? ""}`}>
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
    </div>
  );
}

export default function AdminPromoCodesLoading() {
  return (
    <div className="space-y-4">
      <h1 className="font-serif-display text-2xl">Promo codes</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Existing codes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">New code</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Code" htmlFor="code">
              <Input id="code" placeholder="WELCOME10" disabled className="uppercase" />
            </Field>
            <Field label="Discounts" htmlFor="scope">
              <select id="scope" disabled className={selectClass}>
                <option>Order subtotal</option>
              </select>
            </Field>
            <Field label="Type" htmlFor="type">
              <select id="type" disabled className={selectClass}>
                <option>Percentage</option>
              </select>
            </Field>
            <Field label="Amount" htmlFor="amount">
              <Input id="amount" type="number" disabled />
            </Field>
            <Field label="Minimum spend (centavos, optional)" htmlFor="minSpendCentavos">
              <Input id="minSpendCentavos" type="number" placeholder="e.g. 200000 for ₱2,000" disabled />
            </Field>
            <Field label="Max redemptions (optional)" htmlFor="maxRedemptions">
              <Input id="maxRedemptions" type="number" placeholder="Unlimited" disabled />
            </Field>
            <Field label="Starts (optional)" htmlFor="startsAt">
              <Input id="startsAt" type="date" disabled />
            </Field>
            <Field label="Ends (optional)" htmlFor="endsAt">
              <Input id="endsAt" type="date" disabled />
            </Field>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" disabled />
              First order only
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" disabled />
              Once per customer
            </label>
            <div className="sm:col-span-2">
              <Button type="button" disabled>
                Create code
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
