import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { CatalogHeader } from "@/components/store/catalog-grid";
import { Eyebrow } from "@/components/ui/section";
import { Skeleton } from "@/components/ui/skeleton";
import { CatalogResultsSkeleton } from "@/components/store/loading";

// loading.tsx can't read the [category] route param (Next.js doesn't pass
// one), so the category title, blurb and trailing breadcrumb crumb genuinely
// aren't knowable ahead of time here — those stay skeletons; "Home > Shop"
// and the eyebrow are the same on every category, so they render for real.
// Mirrors CatalogGrid (src/components/store/catalog-grid.tsx).
export default function CollectionLoading() {
  return (
    <main className="flex w-full flex-1 flex-col px-4 py-10 sm:py-14">
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Shop", href: "/shop" }]} className="mb-6" />
      <CatalogHeader
        eyebrow={<Eyebrow>Le Sillage Manila</Eyebrow>}
        title={<Skeleton className="h-9.5 w-40 sm:h-15 sm:w-56" />}
        subtitle={
          <div className="flex w-full max-w-xl flex-col gap-1">
            <Skeleton className="h-4 w-full sm:h-5" />
            <Skeleton className="h-4 w-full sm:h-5 sm:w-2/3" />
            <Skeleton className="h-4 w-1/2 sm:hidden" />
          </div>
        }
      />
      {/* This route has no pagination — loadCatalogCards runs unlimited
          (src/components/store/shop-view.tsx), so a real category can be a
          handful of items. CatalogResultsSkeleton's own default of 20 is
          sized for /shop's PAGE_SIZE, which would badly over-provision
          here; keep this route's smaller, pre-existing guess explicit. */}
      <CatalogResultsSkeleton count={6} pagination={false} />
    </main>
  );
}
