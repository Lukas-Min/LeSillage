import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function NewSkuLoading() {
  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h1 className="font-serif-display text-2xl">Add SKU</h1>
        <Skeleton className="h-4 w-48" />
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">New SKU</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
          <Skeleton className="h-11 w-full sm:w-24 sm:ml-auto" />
        </CardContent>
      </Card>
    </div>
  );
}
