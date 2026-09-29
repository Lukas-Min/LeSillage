import { SectionCard } from "@/components/ui/section";
import { Skeleton } from "@/components/ui/skeleton";

// Mirrors page.tsx: header, Items + totals, then Status and Estimated arrival.
// The Pickup and Payment cards are left out — whether they render depends on
// the order itself, so a skeleton for them would be wrong on most orders.
export default function OrderDetailLoading() {
  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <Skeleton className="h-3 w-28" />
        <Skeleton className="h-9 w-40 sm:h-10" />
        <Skeleton className="h-4 w-64 max-w-full" />
        <div className="flex flex-wrap gap-2 pt-2">
          <Skeleton className="h-11 w-36" />
          <Skeleton className="h-11 w-28" />
        </div>
      </header>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <SectionCard className="flex h-full flex-col lg:col-span-2" eyebrow="Items" contentClassName="flex flex-1 flex-col space-y-0">
          <ul>
            {Array.from({ length: 2 }).map((_, index) => (
              <li key={index} className="flex gap-3 py-3">
                <Skeleton className="h-16 w-16 shrink-0 rounded-md" />
                <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-3 w-28" />
                  </div>
                  <Skeleton className="h-4 w-20" />
                </div>
              </li>
            ))}
          </ul>
          <div className="mt-auto border-t border-border/60 text-sm">
            <div className="flex justify-between py-3">
              <span className="text-muted-foreground">Subtotal</span>
              <Skeleton className="h-4 w-20" />
            </div>
            <div className="flex justify-between py-3">
              <span className="text-muted-foreground">Delivery</span>
              <Skeleton className="h-4 w-16" />
            </div>
            <div className="flex items-baseline justify-between border-t border-border/60 py-3">
              <span className="font-serif-display text-lg">Total</span>
              <Skeleton className="h-7 w-28" />
            </div>
          </div>
        </SectionCard>

        <div className="space-y-4">
          {/* A span, not <Skeleton> (a div): the title renders inside an <h2>. */}
          <SectionCard eyebrow="Status" title={<span className="skeleton-shine block h-5 w-32 rounded-md bg-muted" />}>
            <ol className="space-y-2">
              {Array.from({ length: 5 }).map((_, index) => (
                <li key={index}>
                  <Skeleton className="h-4 w-36" />
                </li>
              ))}
            </ol>
          </SectionCard>
          <SectionCard eyebrow="Estimated arrival" title="When to expect it">
            <Skeleton className="h-4 w-48" />
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
