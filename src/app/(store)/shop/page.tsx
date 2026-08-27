import { CatalogGrid } from "@/components/store/catalog-grid";
import { ShopFilters } from "@/components/store/shop-filters";
import { loadCatalogCards } from "@/lib/catalog";
import { DECANT_SIZES_ML } from "@/domain/decant";
import type { ProductType } from "@/db/schema";

export const dynamic = "force-dynamic";

const VALID_TYPES: ProductType[] = ["DECANT", "FULL_BOTTLE", "PARTIAL"];

export default async function ShopPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; size?: string }>;
}) {
  const params = await searchParams;
  const rawType = (params.type ?? "").toUpperCase();
  const type = VALID_TYPES.includes(rawType as ProductType) ? (rawType as ProductType) : undefined;
  const sizeMl = Number(params.size);
  const validSize =
    type === "DECANT" && DECANT_SIZES_ML.includes(sizeMl as (typeof DECANT_SIZES_ML)[number])
      ? sizeMl
      : undefined;
  const cards = await loadCatalogCards(type ? { type, sizeMl: validSize } : {});
  return (
    <CatalogGrid
      eyebrow="The catalog"
      title="Shop"
      subtitle="Full bottles by pre-order. Partials and decants on hand."
      cards={cards}
      emptyLabel="Nothing on this shelf yet."
      filters={<ShopFilters activeType={type} showDecantSizes={type === "DECANT"} activeSize={validSize} />}
    />
  );
}
