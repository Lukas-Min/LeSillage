import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AreaHeader, MiniStatsSkeleton, PageColumns } from "@/components/ui/page-layout";
import { Skeleton } from "@/components/ui/skeleton";

/** Same layout as the page: header, then the event list and a Summary card from xl, summary first below it. */
export default function AdminAuditLoading() {
  return (
    <div className="flex flex-1 flex-col gap-6">
      <AreaHeader eyebrow="Admin" title="Audit log" />
      <PageColumns
        side={
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <MiniStatsSkeleton labels={["Events shown", "Latest event"]} />
            </CardContent>
          </Card>
        }
        main={
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Latest 100 events</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {/* action · target type · target id · time wraps to three lines on a phone and two below lg. */}
              {Array.from({ length: 8 }).map((_, index) => (
                <div key={index} className="border-t pt-2 first:border-t-0 first:pt-0">
                  <div className="flex flex-col gap-1 py-0.5">
                    <Skeleton className="h-4 w-full max-w-xl" />
                    <Skeleton className="h-4 w-3/4 lg:hidden" />
                    <Skeleton className="h-4 w-1/2 sm:hidden" />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        }
      />
    </div>
  );
}
