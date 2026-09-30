import Link from "next/link";
import { Suspense } from "react";
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
import { compareSkuOrder } from "@/domain/variant-options";
import { isArchivedProduct } from "@/domain/product-archive";
import { cn } from "@/lib/utils";
import { AreaHeader, PAGE_ACTION_CLASS } from "@/components/ui/page-layout";
import { SubmitButton } from "@/components/ui/submit-button";
import { unarchiveProduct } from "@/actions/admin-catalog-actions";
import { PRODUCT_TYPE_TABS, ProductsListSkeleton, type ProductListTab } from "@/components/admin/products-skeleton";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 20;

export default async function ProductsAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; q?: string; page?: string }>;
}) {
  const { type: typeParam, q: qParam, page: pageParam } = await searchParams;
  const activeType: ProductListTab =
    typeParam === "DECANT" || typeParam === "FULL_BOTTLE" || typeParam === "PARTIAL" || typeParam === "ARCHIVED"
      ? typeParam
      : "ALL";
  const query = (qParam ?? "").trim();
  const requestedPage = Math.max(1, parseInt(pageParam ?? "1", 10) || 1);

  return (
    <div className="space-y-6">
      <AreaHeader
        eyebrow="Admin"
        title="Products"
        actions={
          <>
            <Button asChild variant="outline" className={PAGE_ACTION_CLASS}>
              <Link href="/admin/products/fragrantica">Import from Fragrantica</Link>
            </Button>
            <Button asChild className={PAGE_ACTION_CLASS}>
              <Link href="/admin/products/new">New product</Link>
            </Button>
          </>
        }
      />
      {/* loading.tsx doesn't re-show for a query-string-only change on this
          route, so the tab, search and page switches get their own boundary. */}
      <Suspense key={`${activeType}:${query}:${requestedPage}`} fallback={<ProductsListSkeleton activeType={activeType} />}>
        <ProductsList activeType={activeType} query={query} requestedPage={requestedPage} />
      </Suspense>
    </div>
  );
}

async function ProductsList({
  activeType,
  query,
  requestedPage,
}: {
  activeType: ProductListTab;
  query: string;
  requestedPage: number;
}) {
  const [allProductRows, skuRows, promoRow] = await Promise.all([
    db().select().from(products),
    db().select().from(skus),
    db().select().from(promoSettings),
  ]);
  const threshold = promoRow[0]?.decantPreOrderThresholdMl ?? DEFAULT_DECANT_PREORDER_THRESHOLD_ML;
  // Archived products only show under the Archived tab; the other tabs and
  // their counts are the live catalog (visible or hidden, not archived).
  const archivedIds = new Set(
    allProductRows
      .filter((p) => isArchivedProduct(p, skuRows.filter((s) => s.productId === p.id)))
      .map((p) => p.id),
  );
  const liveRows = allProductRows.filter((p) => !archivedIds.has(p.id));
  const countByType = new Map<ProductType, number>();
  for (const p of liveRows) countByType.set(p.type, (countByType.get(p.type) ?? 0) + 1);
  const tabCount = (tab: ProductListTab) =>
    tab === "ALL" ? liveRows.length : tab === "ARCHIVED" ? archivedIds.size : (countByType.get(tab) ?? 0);

  let filtered =
    activeType === "ARCHIVED"
      ? allProductRows.filter((p) => archivedIds.has(p.id))
      : activeType === "ALL"
        ? liveRows
        : liveRows.filter((p) => p.type === activeType);
  if (query) {
    const q = query.toLowerCase();
    filtered = filtered.filter(
      (p) => p.brand.toLowerCase().includes(q) || p.name.toLowerCase().includes(q),
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

  function hrefFor(overrides: { type?: ProductListTab; q?: string; page?: number }) {
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
    <div className="flex flex-col gap-4">
      <div className="scrollbar-hide flex items-center gap-1 overflow-x-auto border-b border-border">
        {PRODUCT_TYPE_TABS.map((tab) => {
          const count = tabCount(tab.value);
          const active = tab.value === activeType;
          return (
            <Link
              key={tab.value}
              href={hrefFor({ type: tab.value, page: 1 })}
              className={cn(
                "min-h-11 shrink-0 border-b-2 px-3 py-2 text-xs uppercase tracking-[0.15em] whitespace-nowrap transition-colors",
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
        <div className="flex w-full sm:max-w-xs">
          <Input
            type="search"
            name="q"
            defaultValue={query}
            placeholder="Search by brand or name…"
            className="h-11 rounded-r-none border-r-0"
          />
          <Button
            type="submit"
            variant="gold"
            size="icon-lg"
            aria-label="Search"
            className="h-11 w-11 shrink-0 rounded-l-none rounded-r-lg"
          >
            <Search className="h-4 w-4" />
          </Button>
        </div>
      </form>
      {productRows.length === 0 ? (
        <div className="flex min-h-60 flex-1 flex-col items-center justify-center rounded-md border border-dashed border-border/80 p-10 text-center">
          <p className="text-sm text-muted-foreground">
            {query
              ? `No products match "${query}".`
              : activeType === "ARCHIVED"
                ? "No archived products."
                : activeType === "ALL"
                  ? "No products yet."
                  : `No ${labelForType(activeType).toLowerCase()} products yet.`}
          </p>
        </div>
      ) : null}
      {productRows.map((product) => {
        const skusForProduct = skuRows.filter((s) => s.productId === product.id).sort(compareSkuOrder);
        const archived = archivedIds.has(product.id);
        const details = (
          <>
                <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                  <p className="min-w-0 font-serif-display text-base">{product.name}</p>
                  <div className="flex shrink-0 items-center gap-2">
                    {concentrationLabel(product.concentration) ? (
                      <Badge variant="outline">{concentrationLabel(product.concentration)}</Badge>
                    ) : (
                      <Badge variant="destructive">No concentration</Badge>
                    )}
                    <span className="text-xs text-muted-foreground">
                      {archived ? "Archived" : product.isActive ? "Visible" : "Hidden"}
                    </span>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  {product.brand} · {labelForType(product.type)} · {product.fragranceCategory}
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
          </>
        );
        // An archived card can't be one big link: it holds the Unarchive
        // button, and a button inside a link is invalid and unreachable.
        if (archived) {
          return (
            <Card key={product.id}>
              <CardContent className="space-y-2 p-4 text-sm">
                {details}
                <div className="flex flex-wrap justify-end gap-2 border-t pt-3">
                  <Button asChild variant="outline" className="h-11">
                    <Link href={`/admin/products/${product.id}`}>
                      Open<span className="sr-only"> {product.name}</span>
                    </Link>
                  </Button>
                  <form action={unarchiveProduct}>
                    <input type="hidden" name="productId" value={product.id} />
                    <SubmitButton className="h-11" pendingLabel="Unarchiving…">
                      Unarchive<span className="sr-only"> {product.name}</span>
                    </SubmitButton>
                  </form>
                </div>
              </CardContent>
            </Card>
          );
        }
        return (
          <Link key={product.id} href={`/admin/products/${product.id}`} className="block">
            <Card className="transition-colors hover:border-gold/40 hover:bg-muted/30">
              <CardContent className="space-y-2 p-4 text-sm">{details}</CardContent>
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
