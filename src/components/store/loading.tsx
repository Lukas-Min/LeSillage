import { Skeleton } from "@/components/ui/skeleton";

export function CatalogCardsSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 md:gap-6">
      {Array.from({ length: count }).map((_, idx) => (
        <div key={idx} className="overflow-hidden rounded-md border border-border">
          <Skeleton className="aspect-square w-full rounded-none" />
          <div className="space-y-3 p-4">
            <div className="space-y-2">
              <Skeleton className="h-3 w-1/3" />
              <Skeleton className="h-5 w-2/3" />
              <Skeleton className="h-3 w-1/4" />
            </div>
            <div className="flex flex-wrap gap-1.5">
              <Skeleton className="h-5 w-16 rounded-none" />
              <Skeleton className="h-5 w-14 rounded-none" />
            </div>
            <div className="flex flex-wrap gap-1.5">
              <Skeleton className="h-9 min-w-[2.75rem] flex-1 rounded-none" />
              <Skeleton className="h-9 min-w-[2.75rem] flex-1 rounded-none" />
              <Skeleton className="h-9 min-w-[2.75rem] flex-1 rounded-none" />
              <Skeleton className="h-9 min-w-[2.75rem] flex-1 rounded-none" />
            </div>
            <Skeleton className="ml-auto h-5 w-1/2" />
          </div>
          <div className="px-4 pb-4">
            <Skeleton className="h-11 w-full rounded-md" />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Matches CatalogPagination's shape (src/components/store/catalog-pagination.tsx) —
 *  First/Prev, three numbered pills, Next/Last on sm+, "Page X of Y" on mobile. */
export function CatalogPaginationSkeleton() {
  return (
    <div className="mt-8 flex items-center justify-center gap-1.5">
      <Skeleton className="hidden h-11 w-11 rounded-md sm:block" />
      <Skeleton className="h-11 w-11 rounded-md" />
      <div className="hidden items-center gap-1.5 sm:flex">
        <Skeleton className="h-11 w-11 rounded-md" />
        <Skeleton className="h-11 w-11 rounded-md" />
        <Skeleton className="h-11 w-11 rounded-md" />
      </div>
      <Skeleton className="h-4 w-20 sm:hidden" />
      <Skeleton className="h-11 w-11 rounded-md" />
      <Skeleton className="hidden h-11 w-11 rounded-md sm:block" />
    </div>
  );
}

export function CatalogResultsSkeleton({
  count = 6,
  showCount = true,
}: {
  count?: number;
  /** Set false wherever the real results view is rendered with its own
   *  `showCount={false}` (e.g. the shop page, whose `ShopToolbar` already
   *  shows the count) — otherwise this skeletons a count line that never
   *  actually appears. */
  showCount?: boolean;
}) {
  return (
    <>
      {showCount ? <Skeleton className="mx-auto mb-6 h-3 w-24" /> : null}
      <CatalogCardsSkeleton count={count} />
      <CatalogPaginationSkeleton />
    </>
  );
}

export function CatalogSkeleton() {
  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:py-12">
      <Skeleton className="h-3 w-24" />
      <Skeleton className="mt-2 h-8 w-1/2" />
      <Skeleton className="mt-2 h-4 w-1/3" />
      <div className="mt-6">
        <CatalogCardsSkeleton />
        <CatalogPaginationSkeleton />
      </div>
    </main>
  );
}
