import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { OrderTier } from "@/domain/order-state";

/**
 * The Ongoing/Completed/Cancelled tabs on /admin/orders are query-string
 * navigation on one route, so `loading.tsx` alone never retriggers when you
 * switch between them — each tab fetches inside its own Suspense boundary and
 * falls back to this, shaped like the real order card (order number + status
 * pill header, the contact line, placed date + total). `tier` picks the lines
 * that tab's cards actually carry: a receipt link on Ongoing and Completed, a
 * rejection/cancellation reason on Cancelled, and action buttons only on
 * Ongoing (the other tabs still render the empty actions wrapper).
 */
export function OrdersListSkeleton({ rows = 3, tier = "ONGOING" }: { rows?: number; tier?: OrderTier }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: rows }).map((_, index) => (
        <Card key={index}>
          <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
            <Skeleton className="h-5.5 w-32" />
            <Skeleton className="h-5.5 w-28" />
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {/* Recipient · email · phone · method wraps to two lines on a phone. */}
            <div className="flex flex-col gap-1 py-0.5">
              <Skeleton className="h-4 w-full max-w-md" />
              <Skeleton className="h-4 w-2/3 sm:hidden" />
            </div>
            <div className="py-0.5">
              <Skeleton className={tier === "CANCELLED" ? "h-4 w-48" : "h-4 w-36"} />
            </div>
            <div className="flex flex-wrap items-end justify-between gap-x-3 gap-y-1 pt-1">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-7 w-24" />
            </div>
            <div className="flex flex-col items-end gap-2 sm:flex-row sm:items-center sm:justify-end">
              {tier === "ONGOING" ? <Skeleton className="h-11 w-24" /> : null}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
