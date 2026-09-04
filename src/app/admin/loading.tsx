import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export default function AdminLoading() {
  return (
    <div className="space-y-4">
      <h1 className="font-serif-display text-2xl">Admin dashboard</h1>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Pending receipts</CardTitle>
          </CardHeader>
          <CardContent>
            <Skeleton className="h-8 w-10" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Awaiting payment</CardTitle>
          </CardHeader>
          <CardContent>
            <Skeleton className="h-8 w-10" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Low stock</CardTitle>
          </CardHeader>
          <CardContent>
            <Skeleton className="h-8 w-10" />
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Low stock</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1.5">
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
        </CardContent>
      </Card>
    </div>
  );
}
