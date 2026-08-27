import { CatalogGrid } from "@/components/store/catalog-grid";
import { ShopFilters } from "@/components/store/shop-filters";
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
  const cards = await loadCatalogCards(type ? { type } : {});
  return (
    <CatalogGrid
      eyebrow="The catalog"
      title="Shop"
      subtitle="Full bottles by pre-order. Partials and decants on hand."
      cards={cards}
      emptyLabel="Nothing on this shelf yet."
      filters={<ShopFilters activeType={type} />}
    />
  );
}
