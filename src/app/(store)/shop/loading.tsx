import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { Eyebrow } from "@/components/ui/section";
import { ShopFilters } from "@/components/store/shop-filters";
import { CatalogResultsSkeleton } from "@/components/store/loading";
import { SHOP_CATALOG_SUBTITLE } from "@/lib/faq-copy";
import { CatalogHeader } from "@/components/store/catalog-grid";

// The header/eyebrow/subtitle and shelf tabs are the same regardless of
// which filters are selected, so they render for real here — `loading.tsx`
// can't read the `type` search param (Next.js doesn't pass one), so the
// trailing "Decant"/"Full bottle"/"Partial" breadcrumb crumb (added once the
// real page resolves it) is the only piece this fallback can't show ahead
// of time; only the actual results area is skeletoned.
export default function ShopLoading() {
  return (
    <main className="flex w-full flex-1 flex-col px-4 pt-4 pb-10 sm:pt-6 sm:pb-14">
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Shop", href: "/shop" }]} />
      <CatalogHeader eyebrow={<Eyebrow>The catalog</Eyebrow>} title="Shop" subtitle={SHOP_CATALOG_SUBTITLE} />
      <div className="mb-4 flex justify-center">
        <ShopFilters />
      </div>
      <CatalogResultsSkeleton toolbar />
    </main>
  );
}
