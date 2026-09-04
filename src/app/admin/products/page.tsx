import Link from "next/link";
import { db } from "@/db/client";
import { products, skus, promoSettings, type ProductType } from "@/db/schema";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { formatPHP } from "@/domain/money";
import { concentrationLabel } from "@/domain/concentration";
import { decantFulfillment, DEFAULT_DECANT_PREORDER_THRESHOLD_ML } from "@/domain/decant";
import { labelForType } from "@/domain/product-type";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const TYPE_TABS: { value: ProductType | "ALL"; label: string }[] = [
  { value: "ALL", label: "All" },
  { value: "DECANT", label: "Decants" },
  { value: "FULL_BOTTLE", label: "Full bottles" },
  { value: "PARTIAL", label: "Partials" },
];

const PAGE_SIZE = 20;

export default async function ProductsAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; q?: string; page?: string }>;
}) {
  const { type: typeParam, q: qParam, page: pageParam } = await searchParams;
  const activeType: ProductType | "ALL" =
    typeParam === "DECANT" || typeParam === "FULL_BOTTLE" || typeParam === "PARTIAL" ? typeParam : "ALL";
  const query = (qParam ?? "").trim();
  const requestedPage = Math.max(1, parseInt(pageParam ?? "1", 10) || 1);

  const [allProductRows, skuRows, promoRow] = await Promise.all([
    db().select().from(products),
    db().select().from(skus),
    db().select().from(promoSettings),
  ]);
  const threshold = promoRow[0]?.decantPreOrderThresholdMl ?? DEFAULT_DECANT_PREORDER_THRESHOLD_ML;
  const countByType = new Map<ProductType, number>();
  for (const p of allProductRows) countByType.set(p.type, (countByType.get(p.type) ?? 0) + 1);

  let filtered = activeType === "ALL" ? allProductRows : allProductRows.filter((p) => p.type === activeType);
  if (query) {
    const q = query.toLowerCase();
    filtered = filtered.filter(
      (p) => p.brand.toLowerCase().includes(q) || p.name.toLowerCase().includes(q) || (p.family ?? "").toLowerCase().includes(q),
    );
  }
  // Always alphabetical, A first — by brand, then name within a brand.
  filtered = [...filtered].sort((a, b) => {
    const byBrand = a.brand.localeCompare(b.brand, undefined, { sensitivity: "base" });
    if (byBrand !== 0) return byBrand;
    return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const page = Math.min(requestedPage, totalPages);
  const productRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function hrefFor(overrides: { type?: ProductType | "ALL"; q?: string; page?: number }) {
    const params = new URLSearchParams();
    const t = overrides.type ?? activeType;
    if (t !== "ALL") params.set("type", t);
    const qq = overrides.q ?? query;
    if (qq) params.set("q", qq);
    const p = overrides.page ?? page;
    if (p > 1) params.set("page", String(p));
    const qs = params.toString();
    return `/admin/products${qs ? `?${qs}` : ""}`;
  }

  return (
    <div className="flex flex-1 flex-col space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="font-serif-display text-2xl">Products</h1>
        <div className="flex items-center gap-3">
          <Link href="/admin/products/new" className="text-xs text-muted-foreground hover:underline">
            Add manually
          </Link>
          <Button asChild>
            <Link href="/admin/products/fragrantica">New product</Link>
          </Button>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-1 border-b border-border">
        {TYPE_TABS.map((tab) => {
          const count = tab.value === "ALL" ? allProductRows.length : (countByType.get(tab.value) ?? 0);
          const active = tab.value === activeType;
          return (
            <Link
              key={tab.value}
              href={hrefFor({ type: tab.value, page: 1 })}
              className={cn(
                "min-h-11 border-b-2 px-3 py-2 text-xs uppercase tracking-[0.15em] transition-colors",
                active
                  ? "border-gold text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              {tab.label} ({count})
            </Link>
          );
        })}
      </div>
      <form action="/admin/products" className="flex flex-wrap items-center justify-end gap-2">
        {activeType !== "ALL" ? <input type="hidden" name="type" value={activeType} /> : null}
        {query ? (
          <Link href={hrefFor({ q: "", page: 1 })} className="text-xs text-muted-foreground hover:underline">
            Clear search
          </Link>
        ) : null}
        <div className="flex w-full max-w-xs">
          <Input
            type="search"
            name="q"
            defaultValue={query}
            placeholder="Search by brand or name…"
            className="h-11 rounded-r-none border-r-0"
          />
          <Button type="submit" variant="outline" size="icon-lg" aria-label="Search" className="h-11 w-11 shrink-0 rounded-l-none">
            <Search className="h-4 w-4" />
          </Button>
        </div>
      </form>
      {productRows.length === 0 ? (
        <Card className="flex flex-1 flex-col">
          <CardContent className="flex flex-1 flex-col items-center justify-center p-6 text-center text-sm text-muted-foreground">
            {query
              ? `No products match "${query}".`
              : activeType === "ALL"
                ? "No products yet."
                : `No ${labelForType(activeType).toLowerCase()} products yet.`}
          </CardContent>
        </Card>
      ) : null}
      {productRows.map((product) => {
        const skusForProduct = skuRows.filter((s) => s.productId === product.id);
        return (
          <Link key={product.id} href={`/admin/products/${product.id}`} className="block">
            <Card className="transition-colors hover:border-gold/40 hover:bg-muted/30">
              <CardContent className="space-y-2 p-4 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-serif-display text-base">{product.name}</p>
                  <div className="flex items-center gap-2">
                    {concentrationLabel(product.concentration) ? (
                      <Badge variant="outline">{concentrationLabel(product.concentration)}</Badge>
                    ) : (
                      <Badge variant="destructive">No concentration</Badge>
                    )}
                    <span className="text-xs text-muted-foreground">{product.isActive ? "Visible" : "Hidden"}</span>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  {product.brand} · {product.family ?? "—"} · {labelForType(product.type)} · {product.fragranceCategory}
                  {product.type === "DECANT" ? ` · ${product.remainingMl ?? 0}ml left` : ""}
                </p>
                <ul className="mt-2 space-y-1">
                  {skusForProduct.map((sku) => {
                    const availability =
                      product.type === "DECANT"
                        ? decantFulfillment({
                            remainingMl: product.remainingMl ?? 0,
                            sizeMl: sku.sizeMl ?? 0,
                            thresholdMl: threshold,
                          })
                        : `${sku.fulfillment} · stock ${sku.stock}`;
                    return (
                      <li key={sku.id} className="flex justify-between border-t pt-1">
                        <span>
                          {sku.label} · {availability}
                          {sku.isActive ? "" : " · archived"}
                        </span>
                        <span>
                          {formatPHP(sku.retailPrice)} (cost {formatPHP(sku.costPrice)})
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </CardContent>
            </Card>
          </Link>
        );
      })}
      {filtered.length > PAGE_SIZE ? (
        <div className="flex items-center justify-between gap-3 pt-2">
          <Button asChild variant="outline" disabled={page <= 1}>
            {page > 1 ? <Link href={hrefFor({ page: page - 1 })}>Previous</Link> : <span>Previous</span>}
          </Button>
          <p className="text-xs text-muted-foreground">
            Page {page} of {totalPages} · {filtered.length} product{filtered.length === 1 ? "" : "s"}
          </p>
          <Button asChild variant="outline" disabled={page >= totalPages}>
            {page < totalPages ? <Link href={hrefFor({ page: page + 1 })}>Next</Link> : <span>Next</span>}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
