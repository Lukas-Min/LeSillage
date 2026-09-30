import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { AreaHeader, MiniStat, MiniStats, PageColumns } from "@/components/ui/page-layout";

/** Same layout as the page: the static header, the At a glance tiles, then the Low stock list. */
export default function AdminLoading() {
  return (
    <div className="space-y-6">
      <AreaHeader eyebrow="Admin" title="Admin dashboard" />
      <PageColumns
        side={
          <Card>
            <CardHeader>
              <CardTitle className="text-base">At a glance</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <MiniStats>
                <MiniStat label="Pending receipts" value={<Skeleton className="my-1 h-6 w-10" />} />
                <MiniStat label="Awaiting payment" value={<Skeleton className="my-1 h-6 w-10" />} />
                <MiniStat label="Low stock" value={<Skeleton className="my-1 h-6 w-10" />} className="col-span-2" />
              </MiniStats>
              <Link
                href="/admin/orders"
                className="inline-flex min-h-11 items-center text-sm underline underline-offset-4 hover:text-foreground"
              >
                View ongoing orders
              </Link>
            </CardContent>
          </Card>
        }
        main={
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
        }
      />
    </div>
  );
}
