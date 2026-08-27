import { CatalogGrid } from "@/components/store/catalog-grid";
import { ShopFilters } from "@/components/store/shop-filters";
import { loadCatalogCards } from "@/lib/catalog";
import type { ProductType } from "@/db/schema";

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
  const cards = await loadCatalogCards({
    types: type ? [type] : ["FULL_BOTTLE", "PARTIAL"],
  });
  const title =
    type === "PARTIAL" ? "Partials" : type === "FULL_BOTTLE" ? "Full bottles" : "Bottles";
  return (
    <CatalogGrid
      eyebrow="Le Sillage · Manila"
      title={title}
      subtitle="Pre-order a full bottle, or pick up a partial from stock."
      cards={cards}
      emptyLabel="Nothing on this shelf yet."
      filters={<ShopFilters mode="bottles" activeType={type} />}
    />
  );
}
