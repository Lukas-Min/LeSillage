import Link from "next/link";
import { createPromoCode } from "@/actions/admin-promo-code-actions";
import { PromoCodeForm } from "@/components/admin/promo-code-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AreaHeader, PAGE_ACTION_CLASS } from "@/components/ui/page-layout";
import { loadCustomerOptions } from "@/lib/promo-code-access";

export const dynamic = "force-dynamic";

export default async function NewPromoCodePage() {
  const customers = await loadCustomerOptions();
  return (
    <div className="space-y-6">
      <AreaHeader
        eyebrow="Promo codes"
        title="New promo code"
        actions={
          <Button asChild variant="outline" className={PAGE_ACTION_CLASS}>
            <Link href="/admin/promo?tab=codes">Back</Link>
          </Button>
        }
      />
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
