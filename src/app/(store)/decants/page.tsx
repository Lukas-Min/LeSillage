import { CatalogGrid } from "@/components/store/catalog-grid";
import { ShopFilters } from "@/components/store/shop-filters";
import { loadCatalogCards } from "@/lib/catalog";
import { DECANT_SIZES_ML } from "@/domain/decant";

export const dynamic = "force-dynamic";

export default async function DecantsPage({
  searchParams,
}: {
  searchParams: Promise<{ size?: string }>;
}) {
  const params = await searchParams;
  const sizeMl = Number(params.size);
  const validSize = DECANT_SIZES_ML.includes(sizeMl as (typeof DECANT_SIZES_ML)[number])
    ? sizeMl
    : undefined;
  const cards = await loadCatalogCards({ type: "DECANT", sizeMl: validSize });
  return (
    <CatalogGrid
      eyebrow="Le Sillage · Manila"
      title="Decants"
      subtitle="Smaller pours of the same bottle — try before a full size."
      cards={cards}
      emptyLabel="No decants at this size yet."
      filters={<ShopFilters mode="decants" showDecantSizes activeSize={validSize} />}
    />
  );
}
