import { ShopView } from "@/components/store/shop-view";

export default async function BrandPage({ params }: { params: Promise<{ brand: string }> }) {
  const { brand } = await params;
  return (
    <ShopView
      title={brand}
      subtitle={`Every fragrance from ${brand}.`}
      filter={{ brand: decodeURIComponent(brand) }}
    />
  );
}
