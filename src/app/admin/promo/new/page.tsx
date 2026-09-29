import { createPromoCode } from "@/actions/admin-promo-code-actions";
import { PromoCodeForm } from "@/components/admin/promo-code-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default function NewPromoCodePage() {
  return (
    <div className="space-y-4">
      <h1 className="font-serif-display text-2xl">New promo code</h1>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">New code</CardTitle>
        </CardHeader>
        <CardContent>
          <PromoCodeForm action={createPromoCode} mode="create" />
        </CardContent>
      </Card>
    </div>
  );
}
