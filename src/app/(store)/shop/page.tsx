import { Suspense } from "react";
import { CatalogResults } from "@/components/store/catalog-grid";
import { CatalogResultsSkeleton } from "@/components/store/loading";
import { ShopFilters } from "@/components/store/shop-filters";
import { Eyebrow } from "@/components/ui/section";
import { loadCatalogCards } from "@/lib/catalog";
import type { ProductType } from "@/db/schema";

export const dynamic = "force-dynamic";

const VALID_TYPES: ProductType[] = ["DECANT", "FULL_BOTTLE", "PARTIAL"];

export default async function ShopPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  const params = await searchParams;
  const rawType = (params.type ?? "").toUpperCase();
  const type = VALID_TYPES.includes(rawType as ProductType) ? (rawType as ProductType) : undefined;

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-10 sm:py-14">
      <header className="mb-8 flex flex-col items-center gap-3 text-center">
        <Eyebrow>The catalog</Eyebrow>
        <h1 className="font-serif-display text-4xl leading-tight sm:text-5xl">Shop</h1>
        <p className="max-w-2xl text-sm text-muted-foreground sm:text-base">
          Full bottles by pre-order. Partials and decants on hand.
        </p>
      </header>
      <div className="mb-4 flex justify-center">
        <ShopFilters activeType={type} />
      </div>
      <Suspense key={type ?? "all"} fallback={<CatalogResultsSkeleton />}>
        <ShopResults type={type} />
      </Suspense>
    </main>
  );
}

async function ShopResults({ type }: { type?: ProductType }) {
  const cards = await loadCatalogCards(type ? { type } : {});
  return <CatalogResults cards={cards} emptyLabel="Nothing on this shelf yet." />;
}
