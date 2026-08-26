import Link from "next/link";
import { db } from "@/db/client";
import { products, skus } from "@/db/schema";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatPHP } from "@/domain/money";

export const dynamic = "force-dynamic";

export default async function ProductsAdminPage() {
  const productRows = await db().select().from(products);
  const skuRows = await db().select().from(skus);
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="font-serif-display text-2xl">Products</h1>
        <Button asChild>
          <Link href="/admin/products/new">New product</Link>
        </Button>
      </div>
      {productRows.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">No products yet.</CardContent>
        </Card>
      ) : null}
      {productRows.map((product) => {
        const skusForProduct = skuRows.filter((s) => s.productId === product.id);
        return (
          <Card key={product.id}>
            <CardContent className="space-y-2 p-4 text-sm">
              <div className="flex items-center justify-between gap-3">
                <p className="font-serif-display text-base">
                  <Link href={`/admin/products/${product.id}`} className="hover:underline">
                    {product.name}
                  </Link>
                </p>
                <span className="text-xs text-muted-foreground">{product.isActive ? "Visible" : "Hidden"}</span>
              </div>
              <p className="text-xs text-muted-foreground">
                {product.brand} · {product.family ?? "—"} · {product.type}
                {product.type === "DECANT" ? ` · ${product.remainingMl ?? 0}ml left` : ""}
              </p>
              <ul className="mt-2 space-y-1">
                {skusForProduct.map((sku) => (
                  <li key={sku.id} className="flex justify-between border-t pt-1">
                    <span>
                      {sku.label} · {sku.fulfillment} · stock {sku.stock}
                      {sku.isActive ? "" : " · archived"}
                    </span>
                    <span>
                      {formatPHP(sku.retailPrice)} (cost {formatPHP(sku.costPrice)})
                    </span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
