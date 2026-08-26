import { CatalogGrid } from "@/components/store/catalog-grid";
import { ShopFilters } from "@/components/store/shop-filters";
import { loadCatalogCards } from "@/lib/catalog";
import { productType, type ProductType } from "@/db/schema";
import { DECANT_SIZES_ML } from "@/domain/decant";

export const dynamic = "force-dynamic";

export default async function ShopPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; size?: string }>;
}) {
  const params = await searchParams;
  const type = productType.includes(params.type as ProductType)
    ? (params.type as ProductType)
    : undefined;
  const sizeMl = Number(params.size);
  const validSize = DECANT_SIZES_ML.includes(sizeMl as (typeof DECANT_SIZES_ML)[number])
    ? sizeMl
    : undefined;
  const cards = await loadCatalogCards({
    type,
    sizeMl: type === "DECANT" ? validSize : undefined,
  });
  return (
    <CatalogGrid
      title="Every scent, in your size"
      subtitle="Full bottles are pre-order. Partials ship from stock. Decants stay listed even when the bottle is low — they switch to pre-order under 10ml."
      cards={cards}
      emptyLabel="Nothing on this shelf yet."
      filters={
        <ShopFilters
          activeType={type}
          showDecantSizes={type === "DECANT"}
          activeSize={validSize}
        />
      }
    />
  );
}
