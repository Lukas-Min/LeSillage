import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";

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
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-5 w-40" />
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
        <Skeleton className="h-10 w-24" />
      </CardContent>
    </Card>
    <Card>
      <CardHeader className="space-y-1">
        <CardTitle className="text-base">Site-wide discount</CardTitle>
        <Skeleton className="h-3 w-56" />
      </CardHeader>
      <CardContent className="space-y-3">
        <Skeleton className="h-5 w-56" />
        <div className="grid grid-cols-2 gap-3">
          {["Type", "Amount", "Starts (optional)", "Ends (optional)"].map((label) => (
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
        <Skeleton className="h-10 w-24" />
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
                  <Skeleton className="h-3 w-56" />
                </div>
                <div className="flex items-center gap-2">
                  <Skeleton className="h-9 w-14" />
                  <Skeleton className="h-9 w-24" />
                  <Skeleton className="h-9 w-20" />
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </>
  );
}
