import { ShopView } from "@/components/store/shop-view";

export default async function BrandPage({ params }: { params: Promise<{ brand: string }> }) {
  const { brand } = await params;
  const decoded = decodeURIComponent(brand);
  return (
    <ShopView
      title={decoded}
      subtitle={`Every fragrance from ${decoded}.`}
      filter={{ brand: decoded }}
      breadcrumbs={[{ label: "Home", href: "/" }, { label: "Brands", href: "/brands" }, { label: decoded }]}
    />
  );
}
