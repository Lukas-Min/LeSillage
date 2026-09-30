import { Search } from "lucide-react";
import type { ProductType } from "@/db/schema";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { MiniStatsSkeleton, PageColumns } from "@/components/ui/page-layout";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export const PRODUCT_TYPE_TABS: { value: ProductType | "ALL"; label: string }[] = [
  { value: "ALL", label: "All" },
  { value: "DECANT", label: "Decants" },
  { value: "FULL_BOTTLE", label: "Full bottles" },
  { value: "PARTIAL", label: "Partials" },
];

/** The Catalog summary's tiles, in order: every product, then one per type. */
export const PRODUCT_SUMMARY_LABELS = ["Total", "Decants", "Full bottles", "Partials"] as const;

/** The Catalog summary card, the tabs, search and product cards on
 *  /admin/products. `activeType` is known when this is the tab-switch
 *  fallback, and unknown in loading.tsx. */
export function ProductsListSkeleton({ activeType }: { activeType?: ProductType | "ALL" }) {
  return (
    <PageColumns
      sideLabel="Catalog summary"
      side={
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Catalog</CardTitle>
          </CardHeader>
          <CardContent>
            <MiniStatsSkeleton labels={PRODUCT_SUMMARY_LABELS} />
          </CardContent>
        </Card>
      }
      main={<ProductsMainSkeleton activeType={activeType} />}
    />
  );
}

function ProductsMainSkeleton({ activeType }: { activeType?: ProductType | "ALL" }) {
  return (
    <>
      <div className="scrollbar-hide flex items-center gap-1 overflow-x-auto border-b border-border">
        {PRODUCT_TYPE_TABS.map((tab) => (
          <span
            key={tab.value}
            className={cn(
              "min-h-11 shrink-0 border-b-2 px-3 py-2 text-xs uppercase tracking-[0.15em] whitespace-nowrap",
              tab.value === activeType ? "border-gold text-foreground" : "border-transparent text-muted-foreground",
            )}
          >
            {tab.label} (<span className="skeleton-shine inline-block h-3 w-4 rounded-md bg-muted align-middle" />)
          </span>
        ))}
      </div>
      <div className="flex flex-wrap items-center justify-end gap-2">
        <div className="flex w-full sm:max-w-xs">
          <Input type="search" placeholder="Search by brand or name…" disabled className="h-11 rounded-r-none border-r-0" />
          <Button type="button" variant="gold" size="icon-lg" aria-label="Search" disabled className="h-11 w-11 shrink-0 rounded-l-none rounded-r-lg">
            <Search className="h-4 w-4" />
          </Button>
        </div>
      </div>
      {Array.from({ length: 3 }).map((_, index) => (
        <Card key={index}>
          <CardContent className="space-y-2 p-4 text-sm">
            <div className="flex items-center justify-between gap-3">
              <Skeleton className="h-6 w-40" />
              <div className="flex items-center gap-2">
                <Skeleton className="h-5 w-24" />
                <Skeleton className="h-4 w-12" />
              </div>
            </div>
            <Skeleton className="h-4 w-56" />
            <ul className="mt-2 space-y-1">
              {Array.from({ length: 2 }).map((_, skuIndex) => (
                <li key={skuIndex} className="flex justify-between border-t pt-1">
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-5 w-28" />
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ))}
    </>
  );
}
