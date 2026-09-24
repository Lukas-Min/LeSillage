import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * The Ongoing/Completed/Cancelled tabs on /admin/orders are query-string
 * navigation on one route, so `loading.tsx` alone never retriggers when you
 * switch between them — each tab fetches inside its own Suspense boundary and
 * falls back to this, shaped like the real order card (order number + status
 * pill header, two text lines, an action-button-sized block). All three tabs
 * share the same card shape, so unlike the promo tabs this needs only one
 * skeleton, not one per tab.
 */
export function OrdersListSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: rows }).map((_, index) => (
        <Card key={index}>
          <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-5 w-24" />
          </CardHeader>
          <CardContent className="space-y-2">
            <Skeleton className="h-4 w-full max-w-sm" />
            <Skeleton className="h-4 w-40" />
            <Skeleton className="ml-auto h-9 w-28" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
