import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function AdminAuditLoading() {
  return (
    <div className="flex flex-1 flex-col space-y-4">
      <h1 className="font-serif-display text-2xl">Audit log</h1>
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
    </div>
  );
}
