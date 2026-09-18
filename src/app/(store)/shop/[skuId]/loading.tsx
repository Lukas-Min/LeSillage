import { Skeleton } from "@/components/ui/skeleton";

export default function ProductLoading() {
  return (
    <main className="w-full px-4 pt-4 pb-8 sm:pt-6 sm:pb-12 2xl:mx-auto 2xl:max-w-[80vw]">
      <Skeleton className="mb-4 h-3 w-40" />
      <div className="flex flex-col gap-8 md:grid md:grid-cols-2 md:gap-12 md:divide-x md:divide-border/60">
        <div className="flex flex-col gap-6 md:pr-12">
          <Skeleton className="aspect-square w-full" />
          <div className="space-y-2">
            <Skeleton className="h-2.5 w-24" />
            <Skeleton className="h-1.5 w-full" />
          </div>
        </div>
        <div className="flex flex-col gap-6 md:pl-12">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1.5">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-10 w-56" />
              <Skeleton className="h-4 w-32" />
            </div>
            <Skeleton className="h-11 w-11 shrink-0" />
          </div>
          <div className="flex flex-col gap-6">
            <Skeleton className="h-8 w-40" />
            {/* Condition (optional per SKU) + Size — stacked, each its own
                label + button row, matching VariantSection in page.tsx. */}
            <div className="space-y-4">
              <div className="space-y-3">
                <Skeleton className="h-2.5 w-16" />
                <Skeleton className="h-11 w-16" />
              </div>
              <div className="space-y-3">
                <Skeleton className="h-2.5 w-10" />
                <Skeleton className="h-11 w-28" />
              </div>
            </div>
            {/* Price, then the quantity stepper on its own row, then
                Add to cart/Buy now as an equal-width pair — matches
                BuyBox/DecantBuyBox's current layout. */}
            <div className="flex flex-col gap-3">
              <Skeleton className="h-8 w-32" />
              <Skeleton className="h-11 w-32" />
              <div className="flex gap-2">
                <Skeleton className="h-11 flex-1" />
                <Skeleton className="h-11 flex-1" />
              </div>
            </div>
          </div>
          <div className="border-t border-border/60">
            <div className="flex items-center justify-between border-b border-border/60 py-4">
              <Skeleton className="h-3 w-36" />
              <Skeleton className="h-4 w-4" />
            </div>
            <div className="flex items-center justify-between py-4">
              <Skeleton className="h-3 w-40" />
              <Skeleton className="h-4 w-4" />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
