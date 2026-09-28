import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function NewCustomerPromoCodeLoading() {
  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <h1 className="font-serif-display text-2xl">Add promo code</h1>
          <Skeleton className="h-4 w-40" />
        </div>
        <Skeleton className="h-11 w-16" />
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">New code</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-11 w-full sm:col-span-3 sm:ml-auto sm:w-20" />
        </CardContent>
      </Card>
    </div>
  );
}
