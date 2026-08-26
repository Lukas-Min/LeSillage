import { ShopView } from "@/components/store/shop-view";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = (q ?? "").trim();
  return (
    <ShopView
      title={query.length > 0 ? `Results for “${query}”` : "Search the catalog"}
      subtitle={query.length > 0 ? undefined : "Try a brand or a fragrance name."}
      filter={{}}
    />
  );
}
