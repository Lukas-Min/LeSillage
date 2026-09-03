import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { Eyebrow } from "@/components/ui/section";
import { ShopFilters } from "@/components/store/shop-filters";
import { CatalogResultsSkeleton } from "@/components/store/loading";

// The header/eyebrow/subtitle and shelf tabs are the same regardless of
// which filters are selected, so they render for real here — `loading.tsx`
// can't read the `type` search param (Next.js doesn't pass one), so the
// trailing "Decant"/"Full bottle"/"Partial" breadcrumb crumb (added once the
// real page resolves it) is the only piece this fallback can't show ahead
// of time; only the actual results area is skeletoned.
export default function ShopLoading() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 pt-4 pb-10 sm:pt-6 sm:pb-14">
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Shop", href: "/shop" }]} />
      <header className="mb-8 flex flex-col items-center gap-3 text-center">
        <Eyebrow>The catalog</Eyebrow>
        <h1 className="font-serif-display text-4xl leading-tight sm:text-5xl">Shop</h1>
        <p className="max-w-2xl text-sm text-muted-foreground sm:text-base">
          Full bottles by pre-order. Partials and decants on hand.
        </p>
      </header>
      <div className="mb-4 flex justify-center">
        <ShopFilters />
      </div>
      <CatalogResultsSkeleton />
    </main>
  );
}
