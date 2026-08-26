import { notFound } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { products, skus, productDiscounts } from "@/db/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function AdminProductDetailPage({
  params,
}: {
  params: Promise<{ productId: string }>;
}) {
  const { productId } = await params;
  const product = (
    await db().select().from(products).where(eq(products.id, productId))
  )[0];
  if (!product) return notFound();
  const [skuList, discountList] = await Promise.all([
    db().select().from(skus).where(eq(skus.productId, productId)).orderBy(asc(skus.label)),
    db().select().from(productDiscounts).where(eq(productDiscounts.productId, productId)),
  ]);
  return (
    <div className="space-y-4">
      <h1 className="font-serif-display text-2xl">{product.name}</h1>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Product</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-sm">
          <p>Brand: {product.brand}</p>
          <p>Family: {product.family ?? "—"}</p>
          <p>Category: {product.fragranceCategory}</p>
          <p>Type: {product.type}</p>
          <p>{product.description}</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">SKUs</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-sm">
          {skuList.length === 0 ? (
            <p className="text-muted-foreground">No SKUs yet.</p>
          ) : (
            skuList.map((sku) => (
              <p key={sku.id}>
                {sku.label} · {sku.fulfillment} · stock {sku.stock} · ₱{(sku.retailPrice / 100).toFixed(2)}
              </p>
            ))
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Discounts</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-sm">
          {discountList.length === 0 ? (
            <p className="text-muted-foreground">No discounts.</p>
          ) : (
            discountList.map((d) => (
              <p key={d.id}>
                {d.type === "PERCENTAGE" ? `${d.amount}%` : `₱${(d.amount / 100).toFixed(2)} off`}{" "}
                — {d.isActive ? "active" : "inactive"}
              </p>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
