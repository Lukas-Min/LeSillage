import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/ui/section";
import { Button } from "@/components/ui/button";

export default function WishlistLoading() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Wishlist"
        title="Saved for later"
        subtitle="Items you hearted from the shop. Tap a card to view, or move it straight to your cart."
        actions={
          <Button asChild variant="outline">
            <Link href="/shop">Find more</Link>
          </Button>
        }
      />
      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-28 w-full rounded-2xl" />
        ))}
      </ul>
    </div>
  );
}
