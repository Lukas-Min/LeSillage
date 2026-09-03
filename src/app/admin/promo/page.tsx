import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { promoSettings } from "@/db/schema";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updatePromoSettings } from "@/actions/admin-actions";

export const dynamic = "force-dynamic";

export default async function PromoSettingsPage() {
  const row = (await db().select().from(promoSettings).where(eq(promoSettings.id, "singleton")))[0];
  return (
    <div className="space-y-4">
      <h1 className="font-serif-display text-2xl">Promo & delivery</h1>
      <Card>
        <CardContent className="p-4">
          <form action={updatePromoSettings} className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="decantThresholdCentavos">Free-shipping threshold (centavos)</Label>
              <Input
                id="decantThresholdCentavos"
                name="decantThresholdCentavos"
                type="number"
                defaultValue={row?.decantThresholdCentavos ?? 200000}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="deliveryFeeCentavos">Delivery fee (centavos)</Label>
              <Input
                id="deliveryFeeCentavos"
                name="deliveryFeeCentavos"
                type="number"
                defaultValue={row?.deliveryFeeCentavos ?? 12000}
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
            <div className="space-y-1">
              <Label htmlFor="decantPreOrderThresholdMl">Decant pre-order threshold (ml)</Label>
              <Input
                id="decantPreOrderThresholdMl"
                name="decantPreOrderThresholdMl"
                type="number"
                defaultValue={row?.decantPreOrderThresholdMl ?? 10}
              />
              <p className="text-xs text-muted-foreground">
                When remaining ml drops below this, every size on that fragrance becomes pre-order.
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
                  className="h-11 w-full rounded-lg border bg-background px-3 text-sm"
                >
                  <option value="PERCENTAGE">Percentage</option>
                  <option value="FIXED">Fixed centavos</option>
                </select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="siteWideDiscountAmount">Amount</Label>
                <Input
                  id="siteWideDiscountAmount"
                  name="siteWideDiscountAmount"
                  type="number"
                  min={0}
                  defaultValue={row?.siteWideDiscountAmount ?? 0}
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Competes with each product's own discount — whichever saves the customer more wins, they never stack.
            </p>
            <Button type="submit">Save</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}