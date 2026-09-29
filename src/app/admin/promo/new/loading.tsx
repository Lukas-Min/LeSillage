import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function NewPromoCodeLoading() {
  return (
    <div className="space-y-4">
      <h1 className="font-serif-display text-2xl">New promo code</h1>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">New code</CardTitle>
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
