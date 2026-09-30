import { SectionCard } from "@/components/ui/section";
import { AreaHeader, MiniStat, MiniStats, PageColumns } from "@/components/ui/page-layout";
import { cn } from "@/lib/utils";

// Spans, not <Skeleton> (a div): they sit inside SectionCard's <p>/<h2> and
// MiniStat's <dd>.
const inlineSkeleton = "skeleton-shine inline-block rounded-md bg-muted align-middle";

// Shaped like a customer with orders: the summary column and the list. The
// empty state (no summary) can't be told apart until the rows load.
export default function OrdersLoading() {
  return (
    <div className="flex flex-1 flex-col space-y-6">
      <AreaHeader
        eyebrow="Orders"
        title="Your orders"
        subtitle="Receipts, payments, confirmations, and shipping — all in one place."
      />
      <PageColumns
        side={
          <SectionCard title="Summary">
            <MiniStats>
              <MiniStat label="Orders" value={<span className={cn(inlineSkeleton, "h-6 w-8")} />} />
              <MiniStat
                label="Active"
                value={<span className={cn(inlineSkeleton, "h-6 w-8")} />}
                hint="not finished yet"
              />
              <MiniStat
                label="Total spent"
                value={<span className={cn(inlineSkeleton, "h-6 w-32")} />}
                hint="confirmed orders only"
                className="col-span-2"
              />
            </MiniStats>
          </SectionCard>
        }
        main={
          // Re-order only shows on finished orders, so it isn't drawn.
          <ul className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <li key={i}>
                <SectionCard
                  eyebrow={<span className={cn(inlineSkeleton, "h-2.5 w-24")} />}
                  title={<span className={cn(inlineSkeleton, "h-4 w-24")} />}
                  description={<span className={cn(inlineSkeleton, "h-3.5 w-48 max-w-full")} />}
                  actions={<span className={cn(inlineSkeleton, "h-5.5 w-24 rounded-none")} />}
                  contentClassName="flex flex-wrap items-center justify-between gap-3"
                >
                  <p className="text-xs text-muted-foreground">
                    Order ID <span className={cn(inlineSkeleton, "h-3 w-16")} />
                  </p>
                </SectionCard>
              </li>
            ))}
          </ul>
        }
      />
    </div>
  );
}
