import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { Trash2 } from "lucide-react";
import { requireActiveCustomer } from "@/auth";
import { db } from "@/db/client";
import { wishlists, products, skus, productImages } from "@/db/schema";
import { PageHeader, SectionCard, EmptyState } from "@/components/ui/section";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AddToCartButton } from "@/components/store/add-to-cart-button";
import { removeFromWishlist } from "@/actions/account-actions";
import { formatPHP } from "@/domain/money";

export const dynamic = "force-dynamic";

export default async function WishlistPage() {
  const user = await requireActiveCustomer();
  const client = db();
  const rows = await client
    .select({
      id: wishlists.id,
      productId: products.id,
      name: products.name,
      brand: products.brand,
      family: products.family,
      type: products.type,
    })
    .from(wishlists)
    .innerJoin(products, eq(products.id, wishlists.productId))
    .where(eq(wishlists.userId, user.id))
    .orderBy(desc(wishlists.createdAt));

  if (rows.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader eyebrow="Wishlist" title="Saved for later" />
        <EmptyState
          eyebrow="Nothing saved yet"
          title="Tap the heart on any fragrance"
          description="Saved items appear here so you can find them again at checkout."
          action={
            <Button asChild variant="gold" className="rounded-md">
              <Link href="/shop">Browse fragrances</Link>
            </Button>
          }
        />
      </div>
    );
  }

  const productIds = rows.map((row) => row.productId);
  const [skuRows, imageRows] = await Promise.all([
    client
      .select({
        id: skus.id,
        productId: skus.productId,
        retailPrice: skus.retailPrice,
        isActive: skus.isActive,
        isTester: skus.isTester,
        stock: skus.stock,
      })
      .from(skus)
      .where(eq(skus.isActive, true)),
    client
      .select({
        productId: productImages.productId,
        url: productImages.url,
        alt: productImages.alt,
        position: productImages.position,
      })
      .from(productImages)
      .where(eq(productImages.productId, productIds[0] ?? "")),
  ]);
  const skuByProduct = new Map(skuRows.map((row) => [row.productId, row]));
  const imageByProduct = new Map(imageRows.map((row) => [row.productId, row]));

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Wishlist"
        title="Saved for later"
        subtitle="Items you hearted from the shop. Tap a card to view, or move it straight to your cart."
        actions={
          <Button asChild variant="outline">
            <Link href="/shop">Find more</Link>
          </Button>
        }
      />
      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {rows.map((row) => {
          const sku = skuByProduct.get(row.productId);
          const image = imageByProduct.get(row.productId);
          return (
            <li key={row.id}>
              <SectionCard
                className="flex h-full flex-col gap-3"
                contentClassName="flex flex-col gap-3"
              >
                <Link href={sku ? `/shop/${sku.id}` : `/brands/${encodeURIComponent(row.brand)}`} className="flex items-center gap-3">
                  <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-secondary">
                    {image ? (
                      <img
                        src={image.url}
                        alt={image.alt ?? row.name}
                        className="h-full w-full object-cover"
                      />
                    ) : null}
                  </div>
                  <div className="min-w-0 space-y-0.5">
                    <p className="truncate font-serif-display text-base leading-tight">{row.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {row.brand} · {row.family ?? "—"}
                    </p>
                    <div className="flex flex-wrap gap-1 pt-1">
                      <Badge variant="outline">{row.type.replace("_", " ").toLowerCase()}</Badge>
                      {sku ? <Badge variant="secondary">{formatPHP(sku.retailPrice)}</Badge> : null}
                    </div>
                  </div>
                </Link>
                <div className="mt-auto flex flex-wrap items-center gap-2">
                  {sku ? <AddToCartButton skuId={sku.id} /> : null}
                  <form action={removeFromWishlist.bind(null, row.id)} className="ml-auto">
                    <Button type="submit" variant="ghost" size="sm">
                      <Trash2 className="h-4 w-4" />
                      Remove
                    </Button>
                  </form>
                </div>
              </SectionCard>
            </li>
          );
        })}
      </ul>
    </div>
  );
}