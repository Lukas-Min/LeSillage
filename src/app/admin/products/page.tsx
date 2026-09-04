import Link from "next/link";
import { db } from "@/db/client";
import { products, skus, promoSettings, type ProductType } from "@/db/schema";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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

export default async function ProductsAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  const { type: typeParam } = await searchParams;
  const activeType: ProductType | "ALL" =
    typeParam === "DECANT" || typeParam === "FULL_BOTTLE" || typeParam === "PARTIAL" ? typeParam : "ALL";

  const [allProductRows, skuRows, promoRow] = await Promise.all([
    db().select().from(products),
    db().select().from(skus),
    db().select().from(promoSettings),
  ]);
  const threshold = promoRow[0]?.decantPreOrderThresholdMl ?? DEFAULT_DECANT_PREORDER_THRESHOLD_ML;
  const countByType = new Map<ProductType, number>();
  for (const p of allProductRows) countByType.set(p.type, (countByType.get(p.type) ?? 0) + 1);
  const productRows = activeType === "ALL" ? allProductRows : allProductRows.filter((p) => p.type === activeType);

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
              href={tab.value === "ALL" ? "/admin/products" : `/admin/products?type=${tab.value}`}
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
      {productRows.length === 0 ? (
        <Card className="flex flex-1 flex-col">
          <CardContent className="flex flex-1 flex-col items-center justify-center p-6 text-center text-sm text-muted-foreground">
            {activeType === "ALL" ? "No products yet." : `No ${labelForType(activeType).toLowerCase()} products yet.`}
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
    </div>
  );
}
