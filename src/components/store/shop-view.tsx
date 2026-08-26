import { CatalogGrid } from "@/components/store/catalog-grid";
import { loadCatalogCards } from "@/lib/catalog";
import type { FragranceCategory, ProductType } from "@/db/schema";

interface Filter {
  fragranceCategory?: FragranceCategory;
  brand?: string;
  query?: string;
  type?: ProductType;
}

interface ShopViewProps {
  title: string;
  subtitle?: string;
  filter: Filter;
  emptyLabel?: string;
}

export async function ShopView({ title, subtitle, filter, emptyLabel }: ShopViewProps) {
  const cards = await loadCatalogCards(filter);
  return (
    <CatalogGrid
      title={title}
      subtitle={subtitle}
      cards={cards}
      emptyLabel={emptyLabel}
    />
  );
}
