import { Suspense } from "react";
import { CatalogResults } from "@/components/store/catalog-grid";
import { CatalogResultsSkeleton } from "@/components/store/loading";
import { ShopFilters } from "@/components/store/shop-filters";
import { ShopToolbar } from "@/components/store/shop-toolbar";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { Eyebrow } from "@/components/ui/section";
import { CATALOG_SORTS, loadCatalogCards, type CatalogSort } from "@/lib/catalog";
import { concentration as CONCENTRATIONS, fragranceCategory as CATEGORIES } from "@/db/schema";
import type { Concentration, FragranceCategory, ProductType } from "@/db/schema";

export const dynamic = "force-dynamic";

const VALID_TYPES: ProductType[] = ["DECANT", "FULL_BOTTLE", "PARTIAL"];

interface ShopSearchParams {
  type?: string;
  category?: string;
  concentration?: string;
  sort?: string;
}

export default async function ShopPage({
  searchParams,
}: {
  searchParams: Promise<ShopSearchParams>;
}) {
  const params = await searchParams;
  const type = parseEnum(params.type, VALID_TYPES) ?? "DECANT";
  const category = parseEnum(params.category, [...CATEGORIES]) as FragranceCategory | undefined;
  const concentration = parseEnum(params.concentration, [...CONCENTRATIONS]) as Concentration | undefined;
  const sort = (parseEnum(params.sort, [...CATALOG_SORTS]) as CatalogSort | undefined) ?? "featured";

  return (
    <main className="mx-auto w-full max-w-6xl px-4 pt-4 pb-10 sm:pt-6 sm:pb-14">
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Shop" }]} />
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
      <Suspense
        key={[type, category, concentration, sort].join("|")}
        fallback={<CatalogResultsSkeleton />}
      >
        <ShopResults type={type} category={category} concentration={concentration} sort={sort} />
      </Suspense>
    </main>
  );
}

async function ShopResults({
  type,
  category,
  concentration,
  sort,
}: {
  type?: ProductType;
  category?: FragranceCategory;
  concentration?: Concentration;
  sort: CatalogSort;
}) {
  const cards = await loadCatalogCards({
    ...(type ? { type } : {}),
    ...(category ? { fragranceCategory: category } : {}),
    ...(concentration ? { concentration } : {}),
    sort,
    limit: 15,
  });
  return (
    <>
      <ShopToolbar
        count={cards.length}
        activeSort={sort}
        activeCategory={category}
        activeConcentration={concentration}
      />
      <CatalogResults cards={cards} emptyLabel="Nothing on this shelf yet." showCount={false} />
    </>
  );
}

function parseEnum<T extends string>(value: string | undefined, allowed: readonly T[]): T | undefined {
  const upper = (value ?? "").toUpperCase();
  const lower = (value ?? "").toLowerCase();
  return allowed.find((entry) => entry === upper || entry === lower || entry === value);
}
