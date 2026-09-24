import { Suspense } from "react";
import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { promoSettings, promoCodes } from "@/db/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/ui/submit-button";
import { ConfirmSubmitButton } from "@/components/ui/confirm-submit-button";
import { PromoCodeForm } from "@/components/admin/promo-code-form";
import { PromoCodeEditDialog } from "@/components/admin/promo-code-edit-dialog";
import { PromoCodesSkeleton, PromoSettingsSkeleton } from "@/components/admin/promo-skeletons";
import { AnnouncementForm } from "@/components/admin/announcement-form";
import { readAnnouncement } from "@/lib/announcement";
import { updatePromoSettings } from "@/actions/admin-actions";
import { createPromoCode, deletePromoCode, togglePromoCodeActive } from "@/actions/admin-promo-code-actions";
import { fromCentavos, formatPHP } from "@/domain/money";
import { cn, formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

const TABS = [
  { value: "settings", label: "Settings" },
  { value: "codes", label: "Promo codes" },
] as const;

const selectClass = "h-11 w-full rounded-lg border bg-background px-3 text-sm";

function amountLabel(type: "PERCENTAGE" | "FIXED", amount: number) {
  return type === "PERCENTAGE" ? `${amount}%` : formatPHP(amount);
}

/** `<input type="date">` wants yyyy-mm-dd; `parseDate` in the action anchors
 *  that to Philippine midnight (see its own comment for why), storing `endsAt`
 *  as the *start of the following* PHT day so the code stays valid through
 *  the whole day the admin picked. This undoes both — the PHT shift, and for
 *  `endsAt` the extra day — so a code edited here round-trips to the exact
 *  day it shows instead of drifting a day off in one direction or the other. */
const PH_UTC_OFFSET_MS = 8 * 60 * 60 * 1000;
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

function toDateInput(value: Date | null, boundary: "start" | "end") {
  if (!value) return "";
  const ms = value.getTime() + PH_UTC_OFFSET_MS - (boundary === "end" ? ONE_DAY_MS : 0);
  return new Date(ms).toISOString().slice(0, 10);
}

export default async function PromoAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab: tabParam } = await searchParams;
  const activeTab = tabParam === "codes" ? "codes" : "settings";

  return (
    <div className="space-y-4">
      <h1 className="font-serif-display text-2xl">Promo & delivery</h1>
      <div className="flex flex-wrap items-center gap-1 border-b border-border">
        {TABS.map((tab) => (
          <Link
            key={tab.value}
            href={tab.value === "settings" ? "/admin/promo" : `/admin/promo?tab=${tab.value}`}
            className={cn(
              "min-h-11 border-b-2 px-3 py-2 text-xs uppercase tracking-[0.15em] transition-colors",
              activeTab === tab.value
                ? "border-gold text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      {/* Each tab fetches inside its own boundary, keyed to the tab: switching
          tabs is a query-string navigation on the same route, which loading.tsx
          does not retrigger. */}
      <Suspense
        key={activeTab}
        fallback={activeTab === "codes" ? <PromoCodesSkeleton /> : <PromoSettingsSkeleton />}
      >
        {activeTab === "codes" ? <CodesTab /> : <SettingsTab />}
      </Suspense>
    </div>
  );
}

async function SettingsTab() {
  const [row, announcement] = await Promise.all([
    db().select().from(promoSettings).where(eq(promoSettings.id, "singleton")).then((rows) => rows[0]),
    readAnnouncement(),
  ]);
  return (
    <>
        <Card>
          <CardContent className="p-4">
            <form action={updatePromoSettings} className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor="decantThresholdCentavos">Free-shipping threshold (₱)</Label>
                <Input
                  id="decantThresholdCentavos"
                  name="decantThresholdCentavos"
                  type="number"
                  step="0.01"
                  defaultValue={fromCentavos(row?.decantThresholdCentavos ?? 200000)}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="deliveryFeeCentavos">Delivery fee (₱)</Label>
                <Input
                  id="deliveryFeeCentavos"
                  name="deliveryFeeCentavos"
                  type="number"
                  step="0.01"
                  defaultValue={fromCentavos(row?.deliveryFeeCentavos ?? 12000)}
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
              <p className="text-xs text-muted-foreground">
                On a delivered order over the decant threshold, assigns one in-stock SKU marked Tester. Those SKUs stay
                listed in the shop. Pickup never receives a complimentary tester.
              </p>
              <div className="space-y-1">
                <Label htmlFor="decantPreOrderThresholdMl">Decant pre-order threshold (ml)</Label>
                <Input
                  id="decantPreOrderThresholdMl"
                  name="decantPreOrderThresholdMl"
                  type="number"
                  defaultValue={row?.decantPreOrderThresholdMl ?? 10}
                />
                <p className="text-xs text-muted-foreground">
                  When remaining ml on an In-house decant drops below this, every In-house size on that fragrance
                  becomes pre-order. Retail decants ignore this pool and use their own stock.
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
                    className={selectClass}
                  >
                    <option value="PERCENTAGE">Percentage</option>
                    <option value="FIXED">Fixed ₱ off</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="siteWideDiscountAmount">Amount (% or ₱)</Label>
                  <Input
                    id="siteWideDiscountAmount"
                    name="siteWideDiscountAmount"
                    type="number"
                    step="0.01"
                    min={0}
                    defaultValue={
                      row?.siteWideDiscountType === "FIXED"
                        ? fromCentavos(row?.siteWideDiscountAmount ?? 0)
                        : row?.siteWideDiscountAmount ?? 0
                    }
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Competes with each product&apos;s own discount — whichever saves the customer more wins, they never stack.
                Free-shipping threshold, delivery fee, and a Fixed discount amount are entered in pesos (add a period
                for centavos) — not centavos.
              </p>
              <Button type="submit">Save</Button>
            </form>
          </CardContent>
        </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Announcement bar</CardTitle>
        </CardHeader>
        <CardContent>
          <AnnouncementForm enabled={announcement.enabled} messages={announcement.messages} />
        </CardContent>
      </Card>
    </>
  );
}

async function CodesTab() {
  const codes = await db().select().from(promoCodes).orderBy(desc(promoCodes.createdAt));
  return (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Existing codes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {codes.length === 0 ? (
                <p className="text-muted-foreground">No promo codes yet.</p>
              ) : (
                codes.map((code) => (
                  <div key={code.id} className="space-y-3 rounded-lg border p-3">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="space-y-1">
                        <p className="font-mono font-medium">{code.code}</p>
                        <p className="text-xs text-muted-foreground">
                          {amountLabel(code.type, code.amount)} off {code.scope === "ORDER" ? "order" : "delivery"}
                          {code.minSpendCentavos ? ` · min spend ${formatPHP(code.minSpendCentavos)}` : ""}
                          {code.firstOrderOnly ? " · first order only" : ""}
                          {code.onePerCustomer ? " · once per customer" : ""}
                          {code.maxRedemptions ? ` · ${code.redemptionCount}/${code.maxRedemptions} used` : ` · ${code.redemptionCount} used`}
                          {code.startsAt ? ` · starts ${formatDate(code.startsAt)}` : ""}
                          {code.endsAt ? ` · ends ${formatDate(code.endsAt)}` : ""}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <PromoCodeEditDialog
                          values={{
                            id: code.id,
                            code: code.code,
                            scope: code.scope,
                            type: code.type,
                            amount: code.type === "FIXED" ? fromCentavos(code.amount) : code.amount,
                            minSpend: code.minSpendCentavos === null ? "" : fromCentavos(code.minSpendCentavos),
                            maxRedemptions: code.maxRedemptions ?? "",
                            startsAt: toDateInput(code.startsAt, "start"),
                            endsAt: toDateInput(code.endsAt, "end"),
                            firstOrderOnly: code.firstOrderOnly,
                            onePerCustomer: code.onePerCustomer,
                            redemptionCount: code.redemptionCount,
                          }}
                        />
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
              <PromoCodeForm action={createPromoCode} mode="create" />
            </CardContent>
          </Card>
        </>
  );
}
