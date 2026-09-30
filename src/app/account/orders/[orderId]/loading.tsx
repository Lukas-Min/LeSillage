import { Button } from "@/components/ui/button";
import { SectionCard } from "@/components/ui/section";
import { AreaHeader, MiniStat, MiniStats, PageColumns } from "@/components/ui/page-layout";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

// Spans, not <Skeleton> (a div): they sit inside headings, paragraphs and
// MiniStat's <dd>.
const inlineSkeleton = "skeleton-shine inline-block rounded-md bg-muted align-middle";

// Mirrors page.tsx: header with the status pill, then the Summary, Status and
// Estimated arrival cards beside Items + totals. Everything else that depends
// on the order itself (Confirm received, Cancel, Re-order, the rejection
// note, "You saved", Pickup, Payment) is left out, since a skeleton for it
// would be wrong on most orders.
export default function OrderDetailLoading() {
  return (
    <div className="space-y-6">
      <AreaHeader
        eyebrow="Order"
        title={<span className={cn(inlineSkeleton, "h-6 w-40 sm:h-7")} />}
        badge={<span className={cn(inlineSkeleton, "h-5.5 w-24 rounded-none")} />}
        subtitle={<span className={cn(inlineSkeleton, "h-3.5 w-64 max-w-full")} />}
        actions={
          <Button type="button" variant="outline" className="h-11 w-full rounded-md sm:w-auto">
            Ask about this order
          </Button>
        }
      />

      <PageColumns
        side={
          <>
            <SectionCard title="Summary">
              <MiniStats>
                <MiniStat
                  label="Total"
                  value={<span className={cn(inlineSkeleton, "h-6 w-28")} />}
                  className="col-span-2"
                />
                <MiniStat label="Items" value={<span className={cn(inlineSkeleton, "h-6 w-8")} />} />
                <MiniStat label="Fulfillment" value={<span className={cn(inlineSkeleton, "h-6 w-20 max-w-full")} />} />
              </MiniStats>
            </SectionCard>
            <SectionCard
              eyebrow="Status"
              title={<span className={cn(inlineSkeleton, "h-4 w-40")} />}
              description="Updated by the team as your order moves through verification and shipping."
            >
              {/* Delivery has six steps, pickup five; draw the shorter list. */}
              <ol className="space-y-2 text-sm">
                {Array.from({ length: 5 }).map((_, index) => (
                  <li key={index}>
                    <span className={cn(inlineSkeleton, "h-3.5 w-32")} />
                  </li>
                ))}
              </ol>
            </SectionCard>
            <SectionCard eyebrow="Estimated arrival" title="When to expect it">
              <ul className="space-y-1 text-sm">
                <li className="flex items-center gap-2">
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-gold" />
                  <span className={cn(inlineSkeleton, "h-3.5 w-24")} />
                </li>
              </ul>
            </SectionCard>
          </>
        }
        main={
          <SectionCard className="flex flex-col" eyebrow="Items" contentClassName="flex flex-1 flex-col space-y-0">
            <ul>
              {Array.from({ length: 2 }).map((_, index) => (
                <li key={index} className="flex gap-3 py-3">
                  <Skeleton className="h-16 w-16 shrink-0 rounded-md" />
                  <div className="flex min-w-0 flex-1 flex-col gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
                    <div className="space-y-1">
                      <Skeleton className="h-4 w-40 max-w-full" />
                      <Skeleton className="h-3 w-28" />
                    </div>
                    <Skeleton className="h-4 w-20" />
                  </div>
                </li>
              ))}
            </ul>
            <div className="mt-auto border-t border-border/60 text-sm">
              <p className="flex justify-between py-3">
                <span className="text-muted-foreground">Subtotal</span>
                <span className={cn(inlineSkeleton, "h-3.5 w-20 self-center")} />
              </p>
              <p className="flex justify-between gap-3 py-3">
                <span className="text-muted-foreground">Delivery</span>
                <span className={cn(inlineSkeleton, "h-3.5 w-16 self-center")} />
              </p>
              <p className="flex items-baseline justify-between border-t border-border/60 py-3">
                <span className="font-serif-display text-lg">Total</span>
                <span className="font-price-display text-2xl">
                  <span className={cn(inlineSkeleton, "h-6 w-28")} />
                </span>
              </p>
            </div>
          </SectionCard>
        }
      />
    </div>
  );
}
