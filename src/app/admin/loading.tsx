import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { AreaHeader, MiniStat, MiniStats, PAGE_ACTION_CLASS } from "@/components/ui/page-layout";

/** Same layout as the page: the static header, the full-width number tiles, then the Low stock list. */
export default function AdminLoading() {
  return (
    <div className="space-y-6">
      <AreaHeader
        eyebrow="Admin"
        title="Admin dashboard"
        actions={
          <Button asChild variant="outline" className={PAGE_ACTION_CLASS}>
            <Link href="/admin/orders">View ongoing orders</Link>
          </Button>
        }
      />
      <MiniStats className="sm:grid-cols-3">
        <MiniStat label="Pending receipts" value={<Skeleton className="my-1 h-6 w-10" />} />
        <MiniStat label="Awaiting payment" value={<Skeleton className="my-1 h-6 w-10" />} />
        <MiniStat label="Low stock" value={<Skeleton className="my-1 h-6 w-10" />} className="col-span-2 sm:col-span-1" />
      </MiniStats>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Low stock</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1.5 text-sm">
          {Array.from({ length: 3 }).map((_, index) => (
            <div
              key={index}
              className="flex items-center justify-between gap-3 rounded-md border border-border/60 px-3 py-2"
            >
              <Skeleton className="h-5 w-48 max-w-full" />
              <Skeleton className="h-4 w-16 shrink-0" />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
