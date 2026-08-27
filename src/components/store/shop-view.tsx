import { CatalogGrid } from "@/components/store/catalog-grid";
import type { BreadcrumbItem } from "@/components/ui/breadcrumbs";
import { loadCatalogCards } from "@/lib/catalog";
import type { FragranceCategory, ProductType } from "@/db/schema";

interface Filter {
  fragranceCategory?: FragranceCategory;
  brand?: string;
  query?: string;
  type?: ProductType;
  types?: ProductType[];
}

interface ShopViewProps {
  title: string;
  subtitle?: string;
  filter: Filter;
  emptyLabel?: string;
  breadcrumbs?: BreadcrumbItem[];
}

export async function ShopView({ title, subtitle, filter, emptyLabel, breadcrumbs }: ShopViewProps) {
  const cards = await loadCatalogCards(filter);
  return (
    <CatalogGrid
      title={title}
      subtitle={subtitle}
      cards={cards}
      emptyLabel={emptyLabel}
      breadcrumbs={breadcrumbs}
    />
  );
}
