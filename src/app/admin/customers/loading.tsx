import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { AreaHeader } from "@/components/ui/page-layout";
import { Skeleton } from "@/components/ui/skeleton";

/** Same layout as the page: header, then the customer list full width. */
export default function AdminCustomersLoading() {
  return (
    <div className="flex flex-1 flex-col gap-6">
      <AreaHeader eyebrow="Admin" title="Customers" />
      <div className="flex flex-1 flex-col gap-4">
        {Array.from({ length: 4 }).map((_, index) => (
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
      </div>
    </div>
  );
}
