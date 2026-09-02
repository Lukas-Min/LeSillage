import { Suspense } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { CatalogResults } from "@/components/store/catalog-grid";
import { CatalogResultsSkeleton } from "@/components/store/loading";
import { ShopFilters } from "@/components/store/shop-filters";
import { ShopToolbar } from "@/components/store/shop-toolbar";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { Button } from "@/components/ui/button";
import { Eyebrow } from "@/components/ui/section";
import { CATALOG_SORTS, loadCatalogCards, type CatalogSort } from "@/lib/catalog";
import { concentration as CONCENTRATIONS, fragranceCategory as CATEGORIES } from "@/db/schema";
import type { Concentration, FragranceCategory, ProductType } from "@/db/schema";

export const dynamic = "force-dynamic";

const VALID_TYPES: ProductType[] = ["DECANT", "FULL_BOTTLE", "PARTIAL"];
const PAGE_SIZE = 15;

interface ShopSearchParams {
  type?: string;
  category?: string;
  concentration?: string;
  sort?: string;
  page?: string;
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
  const page = Math.max(1, Number.parseInt(params.page ?? "1", 10) || 1);

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 pt-4 pb-10 sm:pt-6 sm:pb-14">
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
        key={[type, category, concentration, sort, page].join("|")}
        fallback={<CatalogResultsSkeleton />}
      >
        <ShopResults type={type} category={category} concentration={concentration} sort={sort} page={page} />
      </Suspense>
    </main>
  );
}

async function ShopResults({
  type,
  category,
  concentration,
  sort,
  page,
}: {
  type?: ProductType;
  category?: FragranceCategory;
  concentration?: Concentration;
  sort: CatalogSort;
  page: number;
}) {
  const offset = (page - 1) * PAGE_SIZE;
  const fetched = await loadCatalogCards({
    ...(type ? { type } : {}),
    ...(category ? { fragranceCategory: category } : {}),
    ...(concentration ? { concentration } : {}),
    sort,
    limit: PAGE_SIZE,
    offset,
  });
  const hasNextPage = fetched.length > PAGE_SIZE;
  const cards = hasNextPage ? fetched.slice(0, PAGE_SIZE) : fetched;
  const hasPrevPage = page > 1;

  function pageHref(target: number) {
    const params = new URLSearchParams();
    if (type && type !== "DECANT") params.set("type", type);
    if (category) params.set("category", category);
    if (concentration) params.set("concentration", concentration);
    if (sort !== "featured") params.set("sort", sort);
    if (target > 1) params.set("page", String(target));
    const query = params.toString();
    return query ? `/shop?${query}` : "/shop";
  }

  return (
    <div className="flex flex-1 flex-col">
      <ShopToolbar
        count={cards.length}
        activeSort={sort}
        activeCategory={category}
        activeConcentration={concentration}
      />
      <CatalogResults cards={cards} emptyLabel="Nothing on this shelf yet." showCount={false} />
      {hasPrevPage || hasNextPage ? (
        <div className="mt-8 flex items-center justify-center gap-3">
          <Button asChild variant="outline" size="sm" disabled={!hasPrevPage} className="min-h-11 gap-1.5">
            {hasPrevPage ? (
              <Link href={pageHref(page - 1)} scroll={false}>
                <ChevronLeft className="h-3.5 w-3.5" />
                Previous
              </Link>
            ) : (
              <span>
                <ChevronLeft className="h-3.5 w-3.5" />
                Previous
              </span>
            )}
          </Button>
          <span className="text-xs text-muted-foreground">Page {page}</span>
          <Button asChild variant="outline" size="sm" disabled={!hasNextPage} className="min-h-11 gap-1.5">
            {hasNextPage ? (
              <Link href={pageHref(page + 1)} scroll={false}>
                Next
                <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            ) : (
              <span>
                Next
                <ChevronRight className="h-3.5 w-3.5" />
              </span>
            )}
          </Button>
        </div>
      ) : null}
    </div>
  );
}

function parseEnum<T extends string>(value: string | undefined, allowed: readonly T[]): T | undefined {
  const upper = (value ?? "").toUpperCase();
  const lower = (value ?? "").toLowerCase();
  return allowed.find((entry) => entry === upper || entry === lower || entry === value);
}
