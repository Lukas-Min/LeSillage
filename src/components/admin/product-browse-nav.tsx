import Link from "next/link";
import { ArrowLeft, ChevronLeft, ChevronRight } from "lucide-react";
import { db } from "@/db/client";
import { products, skus } from "@/db/schema";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PRODUCT_TYPE_TABS, type ProductListTab } from "@/components/admin/products-skeleton";
import {
  ADMIN_PRODUCTS_PAGE_SIZE,
  adminProductHref,
  adminProductsListHref,
  buildAdminProductList,
} from "@/lib/admin-product-list";

const NAV_BUTTON_CLASS = "h-11 gap-1 px-3";

/** "Miu Miu Fleur de Lait" stays as it is, not "Miu Miu Miu Miu Fleur de Lait". */
function fullName(product: { brand: string; name: string }): string {
  return product.name.toLowerCase().startsWith(product.brand.toLowerCase())
    ? product.name
    : `${product.brand} ${product.name}`;
}

/**
 * Previous / Next on an admin product page, walking the list it was opened
 * from: the same tab and search as the Products list (carried in this
 * page's `?type=…&q=…`), in the same order (`buildAdminProductList`). With
 * neither, it walks All. "Back" returns to that list. If the product no
 * longer fits the list (edited out of the search, say), only Back shows.
 */
export async function ProductBrowseNav({
  productId,
  tab,
  query,
}: {
  productId: string;
  tab: ProductListTab;
  query: string;
}) {
  const [productRows, skuRows] = await Promise.all([
    db()
      .select({ id: products.id, type: products.type, brand: products.brand, name: products.name, isActive: products.isActive })
      .from(products),
    db()
      .select({ productId: skus.productId, isActive: skus.isActive, fulfillment: skus.fulfillment, stock: skus.stock })
      .from(skus),
  ]);
  const { filtered } = buildAdminProductList(productRows, skuRows, tab, query);
  const index = filtered.findIndex((p) => p.id === productId);
  const previous = index > 0 ? filtered[index - 1] : undefined;
  const next = index >= 0 && index < filtered.length - 1 ? filtered[index + 1] : undefined;
  const tabLabel = PRODUCT_TYPE_TABS.find((t) => t.value === tab)?.label ?? "All";
  // The list page this product sits on, so Back lands where it was.
  const listPage = index >= 0 ? Math.floor(index / ADMIN_PRODUCTS_PAGE_SIZE) + 1 : 1;

  return (
    <nav aria-label="Browse products" className="flex flex-wrap items-center justify-between gap-2">
      <Link
        href={adminProductsListHref(tab, query, listPage)}
        className="inline-flex min-h-11 min-w-0 items-center gap-1.5 text-xs uppercase tracking-[0.15em] text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-ink"
      >
        <ArrowLeft className="h-4 w-4 shrink-0" aria-hidden="true" />
        <span className="truncate">
          {tabLabel}
          {query ? <span className="normal-case tracking-normal"> · “{query}”</span> : null}
        </span>
      </Link>
      {index >= 0 ? (
        <div className="flex items-center gap-2">
          <span className="text-xs tabular-nums text-muted-foreground">
            {index + 1} of {filtered.length}
          </span>
          {previous ? (
            <Button asChild variant="outline" className={NAV_BUTTON_CLASS}>
              <Link
                href={adminProductHref(previous.id, tab, query)}
                title={fullName(previous)}
                aria-label={`Previous: ${fullName(previous)}`}
              >
                <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                Previous
              </Link>
            </Button>
          ) : (
            <Button type="button" variant="outline" disabled className={NAV_BUTTON_CLASS}>
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
              Previous
            </Button>
          )}
          {next ? (
            <Button asChild variant="outline" className={NAV_BUTTON_CLASS}>
              <Link
                href={adminProductHref(next.id, tab, query)}
                title={fullName(next)}
                aria-label={`Next: ${fullName(next)}`}
              >
                Next
                <ChevronRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </Button>
          ) : (
            <Button type="button" variant="outline" disabled className={NAV_BUTTON_CLASS}>
              Next
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </Button>
          )}
        </div>
      ) : null}
    </nav>
  );
}

export function ProductBrowseNavSkeleton() {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <Skeleton className="h-4 w-28" />
      <div className="flex items-center gap-2">
        <Skeleton className="h-3 w-12" />
        <Button type="button" variant="outline" disabled className={NAV_BUTTON_CLASS}>
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          Previous
        </Button>
        <Button type="button" variant="outline" disabled className={NAV_BUTTON_CLASS}>
          Next
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </Button>
      </div>
    </div>
  );
}
