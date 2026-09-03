import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { Skeleton } from "@/components/ui/skeleton";
import { CatalogResultsSkeleton } from "@/components/store/loading";

// loading.tsx can't read the [category] route param (Next.js doesn't pass
// one), so the category name/breadcrumb crumb genuinely isn't knowable
// ahead of time here — that's the one legitimate skeleton left; "Home >
// Shop" is the same on every category, so it renders for real.
export default function CollectionLoading() {
  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:py-12">
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Shop", href: "/shop" }]} />
      <Skeleton className="mt-2 h-8 w-1/2" />
      <Skeleton className="mt-2 h-4 w-1/3" />
      <div className="mt-6">
        <CatalogResultsSkeleton />
      </div>
    </main>
  );
}
