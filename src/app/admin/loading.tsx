import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AreaHeader, MiniStat, MiniStats, PAGE_ACTION_CLASS, PageColumns } from "@/components/ui/page-layout";

/**
 * Same layout as the page: the static header, the full-width number tiles,
 * then Profit and Low stock beside Recent orders. The "no cost set" alert only
 * exists when something is missing, so it isn't drawn here.
 */
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
      <PageColumns
        main={
          <>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Profit</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Period</TableHead>
                      <TableHead className="text-right">Sales</TableHead>
                      <TableHead className="text-right">Cost</TableHead>
                      <TableHead className="text-right">Profit</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {["This month", "Last month", "All time"].map((label) => (
                      <TableRow key={label}>
                        <TableCell>
                          <span className="block font-medium">{label}</span>
                          <Skeleton className="mt-1 h-3 w-12" />
                        </TableCell>
                        {[0, 1, 2].map((cell) => (
                          <TableCell key={cell} className="text-right">
                            <Skeleton className="ml-auto h-4 w-16" />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
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
          </>
        }
        side={
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Recent orders</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1.5 text-sm">
              {Array.from({ length: 5 }).map((_, index) => (
                <div key={index} className="space-y-1 rounded-md border border-border/60 px-3 py-2">
                  <div className="flex items-center justify-between gap-2">
                    <Skeleton className="h-5 w-32" />
                    <Skeleton className="h-4 w-16 shrink-0" />
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <Skeleton className="h-3 w-28" />
                    <Skeleton className="h-5 w-16 shrink-0" />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        }
      />
    </div>
  );
}
