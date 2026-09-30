import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AreaHeaderSkeleton, PageColumns } from "@/components/ui/page-layout";

/**
 * Same layout as the page: header (the status decides which action buttons
 * exist, so one placeholder stands in), then Pickup/Delivery and Items beside
 * Customer and Receipt from xl, main column first below it. Tester bonus only
 * shows on some orders, so it's left out.
 */
export default function AdminOrderDetailLoading() {
  return (
    <div className="space-y-6">
      <AreaHeaderSkeleton badge actions={<Skeleton className="h-11 w-24" />} />

      <PageColumns
        main={
          <>
            <Card>
              <CardHeader>
                {/* "Pickup" or "Delivery" depends on the order. */}
                <Skeleton className="h-5.5 w-20" />
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex flex-col gap-1 py-0.5">
                  <Skeleton className="h-4 w-full max-w-md" />
                  <Skeleton className="h-4 w-1/2 sm:hidden" />
                </div>
                <div className="flex flex-col gap-1 py-0.5">
                  <Skeleton className="h-3 w-full max-w-sm" />
                  <Skeleton className="h-3 w-1/3 sm:hidden" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Items</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {Array.from({ length: 2 }).map((_, index) => (
                  <div
                    key={index}
                    className={
                      index === 0
                        ? "flex items-start justify-between gap-3 border-b border-border/60 pb-3"
                        : "flex items-start justify-between gap-3"
                    }
                  >
                    <div className="min-w-0">
                      <Skeleton className="h-5 w-48 max-w-full" />
                      <Skeleton className="h-4 w-36 max-w-full" />
                    </div>
                    <Skeleton className="h-5 w-16 shrink-0" />
                  </div>
                ))}
                <div className="space-y-1 border-t border-border/60 pt-3 text-sm">
                  {["Subtotal", "Delivery"].map((label) => (
                    <div key={label} className="flex justify-between">
                      <span className="text-muted-foreground">{label}</span>
                      <Skeleton className="h-5 w-16" />
                    </div>
                  ))}
                  <div className="flex justify-between font-medium">
                    <span>Total</span>
                    <Skeleton className="h-5 w-20" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        }
        sideLabel="Customer, receipt and tester"
        side={
          <>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Customer</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 gap-x-6 gap-y-2 text-sm sm:grid-cols-2 xl:grid-cols-1">
                {["Recipient:", "Email:", "Phone:", "Account:"].map((label) => (
                  <div key={label} className="flex items-center gap-1">
                    <span className="text-muted-foreground">{label}</span>
                    <Skeleton className="h-4 w-32" />
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Receipt</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-4 w-48 max-w-full" />
              </CardContent>
            </Card>
          </>
        }
      />
    </div>
  );
}
