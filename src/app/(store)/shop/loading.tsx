import { cookies } from "next/headers";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { CatalogResultsSkeleton } from "@/components/store/loading";
import { SHOP_COLS_COOKIE, shopPageSize } from "@/lib/shop-grid";

// The breadcrumbs are the same regardless of which filters are selected, so
// they render for real here — `loading.tsx` can't read the `type` search
// param (Next.js doesn't pass one), so the trailing "Decant"/"Full
// bottle"/"Partial" crumb (added once the real page resolves it) is the only
// piece this fallback can't show ahead of time; only the results area is
// skeletoned, with as many cards as the page will show (20, or 21 on a
// three-column grid; src/lib/shop-grid.ts).
export default async function ShopLoading() {
  const pageSize = shopPageSize((await cookies()).get(SHOP_COLS_COOKIE)?.value === "3");
  return (
    <main className="flex w-full flex-1 flex-col px-4 pt-4 pb-10 sm:pt-6 sm:pb-14">
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Shop", href: "/shop" }]} />
      {/* No visible header: breadcrumbs, then straight into the products.
          The page still needs its h1 for screen readers. */}
      <h1 className="sr-only">Shop</h1>
      <CatalogResultsSkeleton toolbar count={pageSize} />
    </main>
  );
}
