import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { Skeleton } from "@/components/ui/skeleton";

// Cart data is entirely client-side (cart-context), not server-fetched, so
// this only ever flashes briefly during initial hydration — but the title/
// breadcrumbs are still static and render for real regardless.
export default function CartLoading() {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8">
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Cart" }]} />
      <h1 className="font-serif-display text-2xl">Your cart</h1>
      <div className="mt-6 space-y-4">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    </main>
  );
}
