import { db } from "@/db/client";
import { products, skus } from "@/db/schema";
import { Card, CardContent } from "@/components/ui/card";
import { formatPHP } from "@/domain/money";

export const dynamic = "force-dynamic";

export default async function ProductsAdminPage() {
  const productRows = await db().select().from(products);
  const skuRows = await db().select().from(skus);
  return (
    <div className="space-y-4">
      <h1 className="font-serif-display text-2xl">Products</h1>
      {productRows.map((product) => {
        const skusForProduct = skuRows.filter((s) => s.productId === product.id);
        return (
          <Card key={product.id}>
            <CardContent className="space-y-2 p-4 text-sm">
              <p className="font-serif-display text-base">{product.name}</p>
              <p className="text-xs text-muted-foreground">
                {product.brand} · {product.family ?? "—"} · {product.type}
              </p>
              <ul className="mt-2 space-y-1">
                {skusForProduct.map((sku) => (
                  <li key={sku.id} className="flex justify-between border-t pt-1">
                    <span>
                      {sku.label} · {sku.fulfillment} · stock {sku.stock}
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