import { Suspense } from "react";
import Link from "next/link";
import { desc, eq, inArray } from "drizzle-orm";
import { db } from "@/db/client";
import { promoSettings, promoCodes, users } from "@/db/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/ui/submit-button";
import { ConfirmSubmitButton } from "@/components/ui/confirm-submit-button";
import { PromoCodesSkeleton, PromoSettingsSkeleton } from "@/components/admin/promo-skeletons";
import { AnnouncementForm } from "@/components/admin/announcement-form";
import { readAnnouncement } from "@/lib/announcement";
import { updatePromoSettings } from "@/actions/admin-actions";
import { deletePromoCode, togglePromoCodeActive } from "@/actions/admin-promo-code-actions";
import { SiteWideDiscountForm } from "@/components/admin/site-wide-discount-form";
import { fromCentavos, formatPHP } from "@/domain/money";
import { formatPhDateBoundary, toDisplayDate } from "@/domain/ph-date";
import { siteWideDiscountFromSettings, siteWideDiscountStatus, type SiteWideDiscountConfig } from "@/domain/promo";
import { AdminTabs } from "@/components/admin/admin-tabs";
import { formatDate } from "@/lib/utils";
import { withAllowedUsers } from "@/lib/promo-code-access";

export const dynamic = "force-dynamic";

const TABS = [
  { value: "settings", label: "Settings" },
  { value: "codes", label: "Promo codes" },
] as const;

function amountLabel(type: "PERCENTAGE" | "FIXED", amount: number) {
  return type === "PERCENTAGE" ? `${amount}%` : formatPHP(amount);
}

function siteWideStatusText(config: SiteWideDiscountConfig): string {
  const off = `${amountLabel(config.type, config.amount)} off`;
  const starts = config.startsAt ? formatDate(config.startsAt) : null;
  // endsAt is stored as the start of the day after the last valid one.
  const lastDay = config.endsAt ? formatDate(toDisplayDate(config.endsAt, "end")!) : null;
  const status = siteWideDiscountStatus(config);
  switch (status) {
    case "OFF":
      return "Off — customers see regular prices.";
    case "SCHEDULED":
      return `Scheduled: ${off} from ${starts}${lastDay ? ` through ${lastDay}` : ", no end date"}.`;
    case "ACTIVE":
      return `On now: ${off}${lastDay ? ` through ${lastDay}` : ", no end date"}.`;
    case "ENDED":
      return `Ended: ${off} ran through ${lastDay}. Customers see regular prices.`;
    default: {
      const exhaustive: never = status;
      return exhaustive;
    }
  }
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
      <div className="flex items-center justify-between gap-3">
        <h1 className="font-serif-display text-2xl">Promo & delivery</h1>
        {activeTab === "codes" ? (
          <Button asChild className="h-11">
            <Link href="/admin/promo/new">New</Link>
          </Button>
        ) : null}
      </div>
      <AdminTabs
        tabs={TABS.map((tab) => ({
          ...tab,
          href: tab.value === "settings" ? "/admin/promo" : `/admin/promo?tab=${tab.value}`,
        }))}
        active={activeTab}
      />

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
  const siteWide = siteWideDiscountFromSettings(row);
  return (
    <>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Delivery & tester</CardTitle>
          </CardHeader>
          <CardContent>
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
              <p className="text-xs text-muted-foreground">
                Free-shipping threshold and delivery fee are entered in pesos (add a period for centavos) — not
                centavos.
              </p>
              <SubmitButton className="h-11 w-full sm:ml-auto sm:block sm:w-fit" pendingLabel="Saving…">
                Save
              </SubmitButton>
            </form>
          </CardContent>
        </Card>
      <Card>
        <CardHeader className="space-y-1">
          <CardTitle className="text-base">Site-wide discount</CardTitle>
          <p className="text-xs text-muted-foreground">{siteWideStatusText(siteWide)}</p>
        </CardHeader>
        <CardContent>
          <SiteWideDiscountForm
            values={{
              enabled: siteWide.enabled,
              type: siteWide.type,
              amount: siteWide.type === "FIXED" ? fromCentavos(siteWide.amount) : siteWide.amount,
              startsAt: formatPhDateBoundary(siteWide.startsAt, "start"),
              endsAt: formatPhDateBoundary(siteWide.endsAt, "end"),
            }}
          />
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

/** " · only Ana" / " · only Ana, Ben and 2 others", or nothing for a code open to everyone. */
function allowedLabel(allowedUserIds: readonly string[], customerById: Map<string, string | null>): string {
  if (allowedUserIds.length === 0) return "";
  const names = allowedUserIds.map((id) => customerById.get(id) ?? "a customer");
  if (names.length <= 2) return ` · only ${names.join(" and ")}`;
  return ` · only ${names.slice(0, 2).join(", ")} and ${names.length - 2} other${names.length === 3 ? "" : "s"}`;
}

async function CodesTab() {
  const codes = await withAllowedUsers(await db().select().from(promoCodes).orderBy(desc(promoCodes.createdAt)));
  const restrictedIds = [...new Set(codes.flatMap((code) => code.allowedUserIds))];
  const customers = restrictedIds.length
    ? await db()
        .select({ id: users.id, name: users.name, email: users.email })
        .from(users)
        .where(inArray(users.id, restrictedIds))
    : [];
  const customerById = new Map(customers.map((customer) => [customer.id, customer.name ?? customer.email]));
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
                        <p className="font-price-display">{code.code}</p>
                        <p className="text-xs text-muted-foreground">
                          {amountLabel(code.type, code.amount)} off {code.scope === "ORDER" ? "order" : "delivery"}
                          {code.minSpendCentavos ? ` · min spend ${formatPHP(code.minSpendCentavos)}` : ""}
                          {code.firstOrderOnly ? " · first order only" : ""}
                          {code.onePerCustomer ? " · once per customer" : ""}
                          {code.maxRedemptions ? ` · ${code.redemptionCount}/${code.maxRedemptions} used` : ` · ${code.redemptionCount} used`}
                          {allowedLabel(code.allowedUserIds, customerById)}
                          {code.startsAt ? ` · starts ${formatDate(code.startsAt)}` : ""}
                          {code.endsAt ? ` · ends ${formatDate(toDisplayDate(code.endsAt, "end")!)}` : ""}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button asChild variant="outline" className="h-11">
                          <Link href={`/admin/promo/${code.id}`}>Edit</Link>
                        </Button>
                        <form action={togglePromoCodeActive}>
                          <input type="hidden" name="id" value={code.id} />
                          <input type="hidden" name="isActive" value={(!code.isActive).toString()} />
                          <SubmitButton variant="outline">{code.isActive ? "Deactivate" : "Activate"}</SubmitButton>
                        </form>
                        {code.redemptionCount === 0 || code.code === "WELCOME10" ? (
                          <>
                            <form id={`delete-promo-${code.id}`} action={deletePromoCode}>
                              <input type="hidden" name="id" value={code.id} />
                            </form>
                            <ConfirmSubmitButton
                              formId={`delete-promo-${code.id}`}
                              title="Delete this promo code?"
                              description={
                                code.redemptionCount > 0
                                  ? `"${code.code}" has been used ${code.redemptionCount} times. Deleting it removes the code. Past orders stay as they are.`
                                  : `"${code.code}" has never been redeemed, so this is safe to remove permanently.`
                              }
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
        </>
  );
}
