import { createPromoCode } from "@/actions/admin-promo-code-actions";
import { PromoCodeForm } from "@/components/admin/promo-code-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { loadCustomerOptions } from "@/lib/promo-code-access";

export const dynamic = "force-dynamic";

export default async function NewPromoCodePage() {
  const customers = await loadCustomerOptions();
  return (
    <div className="space-y-4">
      <h1 className="font-serif-display text-2xl">New promo code</h1>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">New code</CardTitle>
        </CardHeader>
        <CardContent>
          <PromoCodeForm action={createPromoCode} mode="create" customers={customers} />
        </CardContent>
      </Card>
    </div>
  );
}
