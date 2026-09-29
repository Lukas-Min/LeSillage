import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { ClearCartButton } from "@/components/store/clear-cart-button";
import { CartContentsSkeleton } from "@/components/store/loading";

// Cart data is entirely client-side (cart-context), not server-fetched, so
// this only ever flashes briefly during initial hydration — but the title/
// breadcrumbs are still static and render for real regardless.
export default function CartLoading() {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8">
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Cart" }]} />
      <div className="flex items-center justify-between gap-2">
        <h1 className="font-serif-display text-2xl">Your cart</h1>
        <ClearCartButton />
      </div>
      <CartContentsSkeleton />
    </main>
  );
}
