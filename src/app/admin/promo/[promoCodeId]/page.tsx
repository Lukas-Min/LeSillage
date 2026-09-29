import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { updatePromoCode } from "@/actions/admin-promo-code-actions";
import { PromoCodeForm } from "@/components/admin/promo-code-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { fromCentavos } from "@/domain/money";
import { formatPhDateBoundary } from "@/domain/ph-date";
import { db } from "@/db/client";
import { promoCodes } from "@/db/schema";
import { loadCustomerOptions, withAllowedUsers } from "@/lib/promo-code-access";

export const dynamic = "force-dynamic";

export default async function EditPromoCodePage({
  params,
}: {
  params: Promise<{ promoCodeId: string }>;
}) {
  const { promoCodeId } = await params;
  const row = (await db().select().from(promoCodes).where(eq(promoCodes.id, promoCodeId)))[0];
  if (!row) return notFound();
  const [code] = await withAllowedUsers([row]);
  const customers = await loadCustomerOptions(code.allowedUserIds);

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="font-serif-display text-2xl">
            Edit <span className="font-price-display">{code.code}</span>
          </h1>
        </div>
        <Button asChild variant="outline" className="h-11">
          <Link href="/admin/promo?tab=codes">Back</Link>
        </Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Promo code</CardTitle>
        </CardHeader>
        <CardContent>
          <PromoCodeForm
            action={updatePromoCode}
            mode="edit"
            customers={customers}
            values={{
              id: code.id,
              code: code.code,
              scope: code.scope,
              type: code.type,
              amount: code.type === "FIXED" ? fromCentavos(code.amount) : code.amount,
              minSpend: code.minSpendCentavos === null ? "" : fromCentavos(code.minSpendCentavos),
              maxRedemptions: code.maxRedemptions ?? "",
              startsAt: formatPhDateBoundary(code.startsAt, "start"),
              endsAt: formatPhDateBoundary(code.endsAt, "end"),
              firstOrderOnly: code.firstOrderOnly,
              onePerCustomer: code.onePerCustomer,
              redemptionCount: code.redemptionCount,
              allowedUserIds: code.allowedUserIds,
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
