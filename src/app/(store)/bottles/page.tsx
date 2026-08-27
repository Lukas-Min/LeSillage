import { CatalogGrid } from "@/components/store/catalog-grid";
import { ShopFilters } from "@/components/store/shop-filters";
import { loadCatalogCards } from "@/lib/catalog";
import { productType, type ProductType } from "@/db/schema";

export const dynamic = "force-dynamic";

export default async function BottlesPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  const params = await searchParams;
  const rawType = (params.type ?? "ALL").toUpperCase();
  const type: ProductType | undefined =
    rawType === "FULL_BOTTLE" || rawType === "PARTIAL"
      ? (rawType as ProductType)
      : undefined;
  const cards = await loadCatalogCards({ type });
  return (
    <CatalogGrid
      title={type === "PARTIAL" ? "Partials" : "Full bottles"}
      subtitle="Pre-order the full bottles you want, or pick up a partial in stock right now."
      cards={cards}
      emptyLabel="Nothing on this shelf yet."
      filters={<ShopFilters mode="bottles" activeType={type} />}
    />
  );
}

export const _productTypeList = productType;
