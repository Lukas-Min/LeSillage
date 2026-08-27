import { ShopView } from "@/components/store/shop-view";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = (q ?? "").trim();
  return (
    <div>
      <form action="/search" className="mx-auto flex w-full max-w-6xl gap-2 px-4 pt-8">
        <Input
          name="q"
          defaultValue={query}
          placeholder="Search a brand, fragrance, or family"
          aria-label="Search"
          className="h-11"
        />
        <Button type="submit" variant="gold" className="h-11 rounded-md">
          Search
        </Button>
      </form>
      <ShopView
        title={query.length > 0 ? `Results for “${query}”` : "Search the catalog"}
        subtitle={query.length > 0 ? undefined : "Try a brand or a fragrance name."}
        filter={{ query: query.length > 0 ? query : undefined }}
        emptyLabel={query.length > 0 ? `No matches for “${query}”.` : "Enter a search to begin."}
      />
    </div>
  );
}
