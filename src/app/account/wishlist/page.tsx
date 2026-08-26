import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { requireActiveCustomer } from "@/auth";
import { db } from "@/db/client";
import { wishlists, products, skus } from "@/db/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SubmitButton } from "@/components/ui/submit-button";
import { removeFromWishlist } from "@/actions/account-actions";
import { AddToCartButton } from "@/components/store/add-to-cart-button";

export const dynamic = "force-dynamic";

export default async function WishlistPage() {
  const user = await requireActiveCustomer();
  const rows = await db()
    .select({
      id: wishlists.id,
      productId: products.id,
      name: products.name,
      brand: products.brand,
      family: products.family,
    })
    .from(wishlists)
    .innerJoin(products, eq(products.id, wishlists.productId))
    .where(eq(wishlists.userId, user.id))
    .orderBy(desc(wishlists.createdAt));
  const skuRows = await db()
    .select({ id: skus.id, productId: skus.productId })
    .from(skus)
    .where(eq(skus.isActive, true));
  return (
    <div className="space-y-4">
      <h1 className="font-serif-display text-2xl">Wishlist</h1>
      {rows.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">Nothing saved here yet.</CardContent>
        </Card>
      ) : (
        rows.map((row) => {
          const sku = skuRows.find((item) => item.productId === row.productId);
          return (
            <Card key={row.id}>
              <CardHeader>
                <CardTitle className="text-base">{row.name}</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-3 text-sm sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">
                    {row.brand} · {row.family ?? "—"}
                  </p>
                  {sku ? (
                    <Link href={`/shop/${sku.id}`} className="text-xs underline-offset-4 hover:underline">
                      View fragrance
                    </Link>
                  ) : (
                    <Link href={`/search?q=${encodeURIComponent(row.brand)}`} className="text-xs underline-offset-4 hover:underline">
                      Browse {row.brand}
                    </Link>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {sku ? <AddToCartButton skuId={sku.id} /> : null}
                  <form action={removeFromWishlist.bind(null, row.id)}>
                    <SubmitButton variant="outline">Remove</SubmitButton>
                  </form>
                </div>
              </CardContent>
            </Card>
          );
        })
      )}
    </div>
  );
}
