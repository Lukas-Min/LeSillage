import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";
import { SectionCard } from "@/components/ui/section";
import { AreaHeader, MiniStatsSkeleton, PAGE_ACTION_CLASS, PageColumns } from "@/components/ui/page-layout";
import { Button } from "@/components/ui/button";

// Shaped like a wishlist with items: the Summary card beside the cards. The
// empty state (no summary) can't be told apart until the rows load.
export default function WishlistLoading() {
  return (
    <div className="space-y-6">
      <AreaHeader
        eyebrow="Wishlist"
        title="Saved for later"
        subtitle="Items you hearted from the shop. Tap a card to view, or move it straight to your cart."
        actions={
          <Button asChild variant="outline" className={PAGE_ACTION_CLASS}>
            <Link href="/shop">Find more</Link>
          </Button>
        }
      />
      <PageColumns
        side={
          <SectionCard title="Summary">
            <MiniStatsSkeleton labels={["Saved"]} />
          </SectionCard>
        }
        main={
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <li key={i}>
                <SectionCard className="flex h-full flex-col gap-3" contentClassName="flex flex-col gap-3">
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-16 w-16 shrink-0 rounded-lg" />
                    <div className="min-w-0 space-y-1">
                      <Skeleton className="h-4 w-36 max-w-full" />
                      <Skeleton className="h-3 w-20" />
                      <div className="flex flex-wrap gap-1 pt-1">
                        <Skeleton className="h-5 w-14 rounded-none" />
                        <Skeleton className="h-5 w-16 rounded-none" />
                      </div>
                    </div>
                  </div>
                  {/* Quantity stepper + Add to cart, then Remove. */}
                  <div className="mt-auto flex flex-wrap items-center gap-2">
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-11 w-32" />
                      <Skeleton className="h-11 w-36" />
                    </div>
                    <Skeleton className="ml-auto h-7 w-20" />
                  </div>
                </SectionCard>
              </li>
            ))}
          </ul>
        }
      />
    </div>
  );
}
