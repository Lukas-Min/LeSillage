import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { Skeleton } from "@/components/ui/skeleton";
import { CatalogResultsSkeleton } from "@/components/store/loading";

// loading.tsx can't read the [category] route param (Next.js doesn't pass
// one), so the category name/breadcrumb crumb genuinely isn't knowable
// ahead of time here — that's the one legitimate skeleton left; "Home >
// Shop" is the same on every category, so it renders for real.
export default function CollectionLoading() {
  return (
    <main className="w-full px-4 py-8 sm:py-12">
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Shop", href: "/shop" }]} />
      <Skeleton className="mt-2 h-8 w-1/2" />
      <Skeleton className="mt-2 h-4 w-1/3" />
      <div className="mt-6">
        {/* This route has no pagination — loadCatalogCards runs unlimited
            (src/components/store/shop-view.tsx), so a real category can be a
            handful of items. CatalogResultsSkeleton's own default of 20 is
            sized for /shop's PAGE_SIZE, which would badly over-provision
            here; keep this route's smaller, pre-existing guess explicit. */}
        <CatalogResultsSkeleton count={6} />
      </div>
    </main>
  );
}
