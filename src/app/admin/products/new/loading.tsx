import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

export default function AdminNewProductLoading() {
  return (
    <div className="space-y-4">
      <h1 className="font-serif-display text-2xl">New product</h1>
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1 sm:col-span-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" disabled />
            </div>
            <Input placeholder="Brand" disabled />
            <Input placeholder="Family" disabled />
            <select disabled className="h-11 rounded-lg border bg-background px-3 text-sm">
              <option>Decant</option>
            </select>
            <select disabled className="h-11 rounded-lg border bg-background px-3 text-sm">
              <option>Niche</option>
            </select>
            <select disabled className="h-11 rounded-lg border bg-background px-3 text-sm">
              <option>No concentration set</option>
            </select>
            <Input type="number" placeholder="Reference size, ml (e.g. 100 for a 100ml bottle)" disabled />
            <Input type="number" placeholder="Remaining ml (decants)" disabled />
            <Textarea placeholder="Description" className="sm:col-span-2" disabled />
            <div className="space-y-1 sm:col-span-2">
              <Label htmlFor="new-costPrice">Cost price (₱, what you paid wholesale)</Label>
              <Input id="new-costPrice" type="number" placeholder="e.g. 3500 — add a period for centavos, e.g. 3500.50" disabled />
            </div>
            <div className="space-y-1">
              <Label htmlFor="new-pricingMode">Pricing formula</Label>
              <select id="new-pricingMode" disabled className="h-11 w-full rounded-lg border bg-background px-3 text-sm">
                <option>Percentage markup</option>
              </select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="new-pricingInput">Markup % (or ₱ for fixed/direct)</Label>
              <Input id="new-pricingInput" type="number" defaultValue={30} disabled />
            </div>
            <p className="text-xs text-muted-foreground sm:col-span-2">
              For decants, every size&apos;s retail price is derived from this: reference price ÷ source ml × that size&apos;s ml.
              Cost price and the Fixed/Direct markup are entered in pesos (add a period for centavos) — not centavos.
            </p>
            <label className="flex items-center gap-2 text-sm sm:col-span-2">
              <input type="checkbox" defaultChecked disabled />
              Visible on storefront
            </label>
            <Button type="button" disabled>
              Create
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
