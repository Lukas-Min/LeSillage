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
        <CardContent className="space-y-1.5 text-sm">
          {Array.from({ length: 3 }).map((_, index) => (
            <div
              key={index}
              className="flex items-center justify-between gap-3 rounded-md border border-border/60 px-3 py-2"
            >
              <Skeleton className="h-5 w-48" />
              <Skeleton className="h-4 w-16 shrink-0" />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
