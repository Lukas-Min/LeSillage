import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { MAX_ANNOUNCEMENT_LENGTH, MAX_ANNOUNCEMENT_MESSAGES } from "@/domain/announcement";

/**
 * The two /admin/promo tabs are query-string navigation on one route, so
 * `loading.tsx` alone never retriggers when you switch between them — each tab
 * fetches inside its own Suspense boundary and falls back to the matching
 * skeleton here. `loading.tsx` reuses the settings one for the first paint,
 * since it can't read `?tab` to know which tab is being opened.
 */
export function PromoSettingsSkeleton() {
  return (
    <>
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Delivery & tester</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-1">
          <Label>Free-shipping threshold (₱)</Label>
          <Skeleton className="h-11 w-full" />
        </div>
        <div className="space-y-1">
          <Label>Delivery fee (₱)</Label>
          <Skeleton className="h-11 w-full" />
        </div>
        <div className="flex items-center gap-2 text-sm">
          <Skeleton className="size-3.5 rounded-sm" />
          Free shipping enabled
        </div>
        <div className="flex items-center gap-2 text-sm">
          <Skeleton className="size-3.5 rounded-sm" />
          Tester bonus enabled
        </div>
        <p className="text-xs text-muted-foreground">
          On a delivered order over the decant threshold, assigns one in-stock SKU marked Tester. Those SKUs stay
          listed in the shop. Pickup never receives a complimentary tester.
        </p>
        <div className="space-y-1">
          <Label>Decant pre-order threshold (ml)</Label>
          <Skeleton className="h-11 w-full" />
          <p className="text-xs text-muted-foreground">
            When remaining ml on an In-house decant drops below this, every In-house size on that fragrance becomes
            pre-order. Retail decants ignore this pool and use their own stock.
          </p>
        </div>
        <p className="text-xs text-muted-foreground">
          Free-shipping threshold and delivery fee are entered in pesos (add a period for centavos) — not centavos.
        </p>
        <Button type="button" disabled>
          Save
        </Button>
      </CardContent>
    </Card>
    <Card>
      <CardHeader className="space-y-1">
        <CardTitle className="text-base">Site-wide discount</CardTitle>
        <Skeleton className="h-4 w-56" />
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex min-h-11 items-center gap-2 text-sm">
          <Skeleton className="size-4 rounded-sm" />
          On (applies to every fragrance)
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label>Type</Label>
            <Skeleton className="h-11 w-full" />
          </div>
          <div className="space-y-1">
            <Skeleton className="h-3.5 w-20" />
            <Skeleton className="h-11 w-full" />
          </div>
          {["Starts (optional)", "Ends (optional)"].map((label) => (
            <div key={label} className="space-y-1">
              <Label>{label}</Label>
              <Skeleton className="h-11 w-full" />
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          Competes with each product&apos;s own discount — whichever saves the customer more wins, they never stack. No
          start date means it starts as soon as it&apos;s on; no end date means it doesn&apos;t expire. Dates are Manila
          days, and the end date is the last full day of the sale.
        </p>
        <Button type="button" disabled>
          Save
        </Button>
      </CardContent>
    </Card>
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Announcement bar</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex min-h-11 items-center gap-2 text-sm">
          <Skeleton className="size-4 rounded-sm" />
          Show the announcement bar
        </div>
        <div className="space-y-1">
          <Label>Messages — one per line</Label>
          <Skeleton className="h-20 w-full" />
          <p className="text-xs text-muted-foreground">
            Up to {MAX_ANNOUNCEMENT_MESSAGES} lines, {MAX_ANNOUNCEMENT_LENGTH} characters each. They scroll in the order
            written and loop continuously, so a line can follow on from the one above it. A promo code written in
            capitals (WELCOME10) is emphasised automatically. Keep them true to the codes and thresholds set on this
            page — customers read this before anything else.
          </p>
        </div>
        <Button type="button" disabled className="h-11 w-full sm:ml-auto sm:block sm:w-fit">
          Save
        </Button>
      </CardContent>
    </Card>
    </>
  );
}

export function PromoCodesSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Existing codes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {Array.from({ length: rows }).map((_, index) => (
            <div key={index} className="space-y-3 rounded-lg border p-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="space-y-1">
                  <Skeleton className="h-5 w-28" />
                  <Skeleton className="h-4 w-56" />
                </div>
                <div className="flex items-center gap-2">
                  <Skeleton className="h-11 w-15" />
                  <Skeleton className="h-11 w-26" />
                  <Skeleton className="h-11 w-20" />
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </>
  );
}
