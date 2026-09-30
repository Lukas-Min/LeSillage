import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { updatePromoCode } from "@/actions/admin-promo-code-actions";
import { PromoCodeForm } from "@/components/admin/promo-code-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AreaHeader, MiniStat, MiniStats, PAGE_ACTION_CLASS, PageColumns } from "@/components/ui/page-layout";
import { formatPHP, fromCentavos } from "@/domain/money";
import { formatPhDateBoundary, toDisplayDate } from "@/domain/ph-date";
import { amountForType, discountedTypesLabel } from "@/domain/promo-code";
import { db } from "@/db/client";
import { promoCodes } from "@/db/schema";
import { loadCustomerOptions, withAllowedUsers } from "@/lib/promo-code-access";
import { formatDate } from "@/lib/utils";

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
  // Pesos for a fixed code, a plain percent otherwise — what the inputs show.
  const displayAmount = (value: number) => (code.type === "FIXED" ? fromCentavos(value) : value);
  // endsAt is stored as the start of the day after the last valid one.
  const lastDay = toDisplayDate(code.endsAt, "end");
  const minSpendTypes = discountedTypesLabel(code);

  return (
    <div className="space-y-6">
      <AreaHeader
        eyebrow="Promo code"
        title={
          <>
            Edit <span className="font-price-display">{code.code}</span>
          </>
        }
        badge={<Badge variant={code.isActive ? "outline" : "secondary"}>{code.isActive ? "Active" : "Inactive"}</Badge>}
        actions={
          <Button asChild variant="outline" className={PAGE_ACTION_CLASS}>
            <Link href="/admin/promo?tab=codes">Back</Link>
          </Button>
        }
      />
      <PageColumns
        side={
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <MiniStats>
                <MiniStat label="Used" value={`${code.redemptionCount} / ${code.maxRedemptions ?? "∞"}`} />
                <MiniStat label="Status" value={code.isActive ? "Active" : "Inactive"} />
                <MiniStat label="Ends" value={lastDay ? formatDate(lastDay) : "No end"} />
                <MiniStat
                  className="col-span-2"
                  label="Minimum"
                  value={code.minSpendCentavos ? formatPHP(code.minSpendCentavos) : "None"}
                  hint={code.minSpendCentavos && minSpendTypes ? `of ${minSpendTypes}` : undefined}
                />
              </MiniStats>
            </CardContent>
          </Card>
        }
        main={
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
                  amount: displayAmount(code.amount),
                  amountMode: code.typeAmounts && Object.keys(code.typeAmounts).length > 0 ? "PER_TYPE" : "SAME",
                  typeAmounts: {
                    DECANT: displayAmount(amountForType(code, "DECANT")),
                    PARTIAL: displayAmount(amountForType(code, "PARTIAL")),
                    FULL_BOTTLE: displayAmount(amountForType(code, "FULL_BOTTLE")),
                  },
                  minSpend: code.minSpendCentavos === null ? "" : fromCentavos(code.minSpendCentavos),
                  maxRedemptions: code.maxRedemptions ?? "",
                  startsAt: formatPhDateBoundary(code.startsAt, "start"),
                  endsAt: formatPhDateBoundary(code.endsAt, "end"),
                  firstOrderOnly: code.firstOrderOnly,
                  onePerCustomer: code.onePerCustomer,
                  redemptionCount: code.redemptionCount,
                  allowedUserIds: code.allowedUserIds,
                  description: code.description ?? "",
                }}
              />
            </CardContent>
          </Card>
        }
      />
    </div>
  );
}
