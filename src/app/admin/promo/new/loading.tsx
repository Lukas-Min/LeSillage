import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const selectClass = "h-11 w-full rounded-lg border bg-background px-3 text-sm";

export default function NewPromoCodeLoading() {
  return (
    <div className="space-y-4">
      <h1 className="font-serif-display text-2xl">New promo code</h1>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">New code</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label>Code</Label>
              <Input placeholder="WELCOME10" disabled className="font-price-display uppercase" />
            </div>
            <div className="space-y-1">
              <Label>Discounts</Label>
              <select disabled className={selectClass}>
                <option>Order subtotal</option>
              </select>
            </div>
            <div className="space-y-1">
              <Label>Type</Label>
              <select disabled className={selectClass}>
                <option>Percentage</option>
              </select>
            </div>
            <div className="space-y-1">
              <Label>Amount (%)</Label>
              <Input type="number" disabled />
            </div>
            <div className="space-y-1">
              <Label>Minimum spend (₱, optional)</Label>
              <Input type="number" placeholder="e.g. 2000" disabled />
            </div>
            <div className="space-y-1">
              <Label>Max redemptions (optional)</Label>
              <Input type="number" placeholder="Unlimited" disabled />
            </div>
            <div className="space-y-1">
              <Label>Starts (optional)</Label>
              <Input type="date" disabled />
            </div>
            <div className="space-y-1">
              <Label>Ends (optional)</Label>
              <Input type="date" disabled />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label>Customers who can use it</Label>
              <div
                aria-disabled="true"
                className="flex min-h-11 w-full cursor-not-allowed items-center gap-2 rounded-lg border border-input px-2 py-1.5 text-sm opacity-50"
              >
                <span className="flex-1 px-1 text-muted-foreground">Every customer</span>
                <ChevronDown aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
              </div>
              <p className="text-xs text-muted-foreground">
                Leave empty for every customer. Add even one and only the customers listed here can use the code.
              </p>
            </div>
            <label className="flex min-h-11 items-center gap-2 text-sm">
              <input type="checkbox" disabled className="size-4" />
              First order only
            </label>
            <label className="flex min-h-11 items-center gap-2 text-sm">
              <input type="checkbox" disabled className="size-4" />
              Once per customer
            </label>
            <label className="flex min-h-11 items-center gap-2 text-sm sm:col-span-2">
              <input type="checkbox" disabled className="size-4" />
              Email the customer(s) who can still use this code
            </label>
            <p className="-mt-2 text-xs text-muted-foreground sm:col-span-2">
              Customers who turned off news and promotions aren&apos;t emailed. They still see the code under Account →
              Promo codes.
            </p>
            <p className="text-xs text-muted-foreground sm:col-span-2">
              Amount is a plain percent for a Percentage discount and pesos for a Fixed/₱ one; minimum spend is always
              pesos.
            </p>
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
