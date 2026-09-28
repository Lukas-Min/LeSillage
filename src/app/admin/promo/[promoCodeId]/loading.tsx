import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function EditPromoCodeLoading() {
  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <h1 className="font-serif-display text-2xl">Edit promo code</h1>
        <Skeleton className="h-11 w-16" />
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Promo code</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-11 w-full sm:col-span-2 sm:ml-auto sm:w-20" />
        </CardContent>
      </Card>
    </div>
  );
}
