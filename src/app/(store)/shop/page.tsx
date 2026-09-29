import { Suspense } from "react";
import type { Metadata } from "next";
import { cookies } from "next/headers";
import { CatalogPagination } from "@/components/store/catalog-pagination";
import { CatalogResults } from "@/components/store/catalog-grid";
import { CatalogResultsSkeleton } from "@/components/store/loading";
import { ShopGridSync } from "@/components/store/shop-grid-sync";
import { ShopToolbar } from "@/components/store/shop-toolbar";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { CATALOG_SORTS, countCatalogCards, loadCatalogCards, type CatalogSort } from "@/lib/catalog";
import { labelForType } from "@/domain/product-type";
import { fragranceCategory as CATEGORIES } from "@/db/schema";
import type { FragranceCategory, Fulfillment, ProductType } from "@/db/schema";
import { GENDERS, type Gender } from "@/domain/gender";
import { SHOP_CATALOG_SUBTITLE } from "@/lib/faq-copy";
import { SHOP_COLS_COOKIE, shopPageSize } from "@/lib/shop-grid";

export const dynamic = "force-dynamic";

const VALID_TYPES: ProductType[] = ["DECANT", "FULL_BOTTLE", "PARTIAL"];

interface ShopSearchParams {
  type?: string;
  category?: string;
  stock?: string;
  gender?: string;
  sort?: string;
  page?: string;
}

// Matches the plural labels already used for this exact tab set elsewhere
// (store-footer.tsx's Shop column, admin/products' type tabs) — not
// derived from labelForType, which returns the singular breadcrumb form.
/** `?stock=` values: the card's On hand / Pre-order badge. */
const STOCK_FILTERS: Fulfillment[] = ["ON_HAND", "PRE_ORDER"];

const TYPE_TITLES: Record<ProductType, string> = {
  DECANT: "Decants",
  FULL_BOTTLE: "Full Bottles",
  PARTIAL: "Partials",
};

// Only `type` gets its own canonical URL — it's the one filter that changes
// the actual catalog being shown (three genuinely distinct product sets).
// category/stock/gender/sort/page are refinements of that same
// catalog, so they canonicalize back to it instead of each combination
// competing as separate near-duplicate pages in search results.
export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<ShopSearchParams>;
}): Promise<Metadata> {
  const params = await searchParams;
  const type = parseEnum(params.type, VALID_TYPES);
  const title = type ? TYPE_TITLES[type] : "Shop";
  const canonical = type ? `/shop?type=${type}` : "/shop";
  return {
    title,
    description: SHOP_CATALOG_SUBTITLE,
    alternates: { canonical },
  };
}

export default async function ShopPage({
  searchParams,
}: {
  searchParams: Promise<ShopSearchParams>;
}) {
  const params = await searchParams;
  // No `type` means every product type: the "All" tab, and every plain
  // /shop link (footer "All fragrances", the homepage's "See all" links).
  const type = parseEnum(params.type, VALID_TYPES);
  const category = parseEnum(params.category, [...CATEGORIES]) as FragranceCategory | undefined;
  const stock = parseEnum(params.stock, STOCK_FILTERS) as Fulfillment | undefined;
  const gender = parseEnum(params.gender, GENDERS) as Gender | undefined;
  const sort = (parseEnum(params.sort, [...CATALOG_SORTS]) as CatalogSort | undefined) ?? "name_asc";
  const page = Math.max(1, Number.parseInt(params.page ?? "1", 10) || 1);
  // 21 per page while the grid is three columns wide, 20 otherwise, so
  // every page ends on a full row (src/lib/shop-grid.ts).
  const threeColumns = (await cookies()).get(SHOP_COLS_COOKIE)?.value === "3";
  const pageSize = shopPageSize(threeColumns);

  return (
    <main className="flex w-full flex-1 flex-col px-4 pt-4 pb-10 sm:pt-6 sm:pb-14">
      <Breadcrumbs
        items={
          type
            ? [{ label: "Home", href: "/" }, { label: "Shop", href: "/shop" }, { label: labelForType(type) }]
            : [{ label: "Home", href: "/" }, { label: "Shop" }]
        }
      />
      {/* No visible header: breadcrumbs, then straight into the products.
          The page still needs its h1 for screen readers. */}
      <h1 className="sr-only">Shop</h1>
      <ShopGridSync threeColumns={threeColumns} />
      <Suspense
        key={[type, category, stock, gender, sort, page, pageSize].join("|")}
        fallback={<CatalogResultsSkeleton toolbar count={pageSize} />}
      >
        <ShopResults
          type={type}
          category={category}
          stock={stock}
          gender={gender}
          sort={sort}
          page={page}
          pageSize={pageSize}
        />
      </Suspense>
    </main>
  );
}

async function ShopResults({
  type,
  category,
  stock,
  gender,
  sort,
  page,
  pageSize,
}: {
  type?: ProductType;
  category?: FragranceCategory;
  stock?: Fulfillment;
  gender?: Gender;
  sort: CatalogSort;
  page: number;
  pageSize: number;
}) {
  const baseFilter = {
    ...(type ? { type } : {}),
    ...(category ? { fragranceCategory: category } : {}),
    ...(stock ? { availability: stock } : {}),
    ...(gender ? { gender } : {}),
  };
  const [total, cards] = await Promise.all([
    countCatalogCards(baseFilter),
    loadCatalogCards({ ...baseFilter, sort, limit: pageSize, offset: (page - 1) * pageSize }),
  ]);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  function pageHref(target: number) {
    const params = new URLSearchParams();
    if (type) params.set("type", type);
    if (category) params.set("category", category);
    if (stock) params.set("stock", stock);
    if (gender) params.set("gender", gender);
    if (sort !== "name_asc") params.set("sort", sort);
    if (target > 1) params.set("page", String(target));
    const query = params.toString();
    return query ? `/shop?${query}` : "/shop";
  }

  return (
    <div className="flex flex-1 flex-col">
      <ShopToolbar
        count={total}
        activeSort={sort}
        activeCategory={category}
        activeStock={stock}
        activeGender={gender}
      />
      <CatalogResults cards={cards} emptyLabel="Nothing on this shelf yet." showCount={false} />
      <CatalogPagination page={page} totalPages={totalPages} href={pageHref} />
    </div>
  );
}

function parseEnum<T extends string>(value: string | undefined, allowed: readonly T[]): T | undefined {
  const upper = (value ?? "").toUpperCase();
  const lower = (value ?? "").toLowerCase();
  return allowed.find((entry) => entry === upper || entry === lower || entry === value);
}
