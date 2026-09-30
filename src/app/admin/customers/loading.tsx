import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AreaHeader, MiniStatsSkeleton, PageColumns } from "@/components/ui/page-layout";
import { Skeleton } from "@/components/ui/skeleton";

/** Same layout as the page: header, then the customer list and a Summary card from xl, summary first below it. */
export default function AdminCustomersLoading() {
  return (
    <div className="flex flex-1 flex-col gap-6">
      <AreaHeader eyebrow="Admin" title="Customers" />
      <PageColumns
        side={
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Summary</CardTitle>
            </CardHeader>
            <CardContent>
              {/* Newest sign-up spans both columns, as on the page. */}
              <MiniStatsSkeleton
                labels={["Customers", "Admins", "Newest sign-up"]}
                className="[&>*:last-child]:col-span-2"
              />
            </CardContent>
          </Card>
        }
        main={Array.from({ length: 4 }).map((_, index) => (
          <Card key={index}>
            <CardHeader>
              <Skeleton className="h-5.5 w-56 max-w-full" />
            </CardHeader>
            <CardContent className="space-y-1 text-sm">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-5 w-28" />
              <Skeleton className="h-4 w-32" />
            </CardContent>
          </Card>
        ))}
      />
    </div>
  );
}
