import Link from "next/link";
import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { products, skus, productImages, productDiscounts, promoSettings } from "@/db/schema";
import { applyDiscount, bestDiscount } from "@/domain/discount";
import { DECANT_SIZES_ML, decantFulfillment, DEFAULT_DECANT_PREORDER_THRESHOLD_ML } from "@/domain/decant";
import { Badge } from "@/components/ui/badge";
import { AddToCartButton } from "@/components/store/add-to-cart-button";
import { Price } from "@/components/store/price";
import { ProductImage } from "@/components/store/product-image";
import { Separator } from "@/components/ui/separator";
import { labelForCondition } from "@/lib/catalog";
import { WishlistButton } from "@/components/store/wishlist-button";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function ProductPage({ params }: { params: Promise<{ skuId: string }> }) {
  const { skuId } = await params;
  const client = db();
  const row = (
    await client
      .select({
        productId: products.id,
        name: products.name,
        brand: products.brand,
        family: products.family,
        type: products.type,
        description: products.description,
        remainingMl: products.remainingMl,
        condition: skus.condition,
        provenance: skus.provenance,
        packaging: skus.packaging,
        skuId: skus.id,
        skuLabel: skus.label,
        sizeMl: skus.sizeMl,
        retailPrice: skus.retailPrice,
        fulfillment: skus.fulfillment,
        stock: skus.stock,
        isTester: skus.isTester,
        isActive: skus.isActive,
        productActive: products.isActive,
      })
      .from(skus)
      .innerJoin(products, eq(products.id, skus.productId))
      .where(eq(skus.id, skuId))
  )[0];
  if (!row || row.isTester || !row.isActive || !row.productActive) return notFound();

  const [images, discounts, siblings, promoRow] = await Promise.all([
    client
      .select({ url: productImages.url, alt: productImages.alt })
      .from(productImages)
      .where(eq(productImages.productId, row.productId)),
    client.select().from(productDiscounts).where(eq(productDiscounts.productId, row.productId)),
    client
      .select({
        id: skus.id,
        label: skus.label,
        sizeMl: skus.sizeMl,
        retailPrice: skus.retailPrice,
        fulfillment: skus.fulfillment,
        stock: skus.stock,
        isActive: skus.isActive,
        isTester: skus.isTester,
      })
      .from(skus)
      .where(and(eq(skus.productId, row.productId), eq(skus.isActive, true), eq(skus.isTester, false))),
    client.select().from(promoSettings).where(eq(promoSettings.id, "singleton")),
  ]);

  const threshold = promoRow[0]?.decantPreOrderThresholdMl ?? DEFAULT_DECANT_PREORDER_THRESHOLD_ML;
  const remainingMl = row.remainingMl ?? 0;
  const fulfillment =
    row.type === "DECANT"
      ? decantFulfillment({
          remainingMl,
          sizeMl: row.sizeMl ?? DECANT_SIZES_ML[0],
          thresholdMl: threshold,
        })
      : row.fulfillment;
  const soldOut = row.type !== "DECANT" && fulfillment === "ON_HAND" && row.stock <= 0;
  const discount = bestDiscount(discounts, row.retailPrice);
  const { discountedUnitCentavos, perUnitDiscountCentavos } = applyDiscount(row.retailPrice, discount);
  const image = images[0];
  const sizeOptions =
    row.type === "DECANT"
      ? DECANT_SIZES_ML.map((size) => {
          const match = siblings.find((s) => s.sizeMl === size);
          return { size, skuId: match?.id ?? null };
        })
      : siblings.map((s) => ({ size: s.sizeMl, skuId: s.id, label: s.label }));

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8">
      <Link href="/shop" className="text-sm text-muted-foreground hover:underline">
        ← Back to catalog
      </Link>
      <div className="mt-4 grid grid-cols-1 gap-8 sm:grid-cols-2">
        <ProductImage
          src={image?.url ?? null}
          alt={image?.alt ?? row.name}
          fallback={row.brand}
          className="aspect-square w-full rounded-2xl"
          sizes="(max-width: 640px) 100vw, 50vw"
        />
        <div className="space-y-4">
          <p className="text-xs uppercase tracking-[0.4em] text-gold">{row.brand}</p>
          <h1 className="font-serif-display text-3xl">{row.name}</h1>
          <div className="flex flex-wrap gap-2">
            <Badge variant={fulfillment === "PRE_ORDER" ? "outline" : "secondary"}>
              {fulfillment === "PRE_ORDER" ? "Pre-order · 3 to 30 days" : "On hand · 1 to 2 days"}
            </Badge>
            {soldOut ? <Badge variant="destructive">Sold out</Badge> : null}
            {row.condition !== "BNIB" ? (
              <Badge variant="outline">{labelForCondition(row.condition)}</Badge>
            ) : null}
            {row.provenance !== "RETAIL" ? <Badge variant="outline">{row.provenance}</Badge> : null}
            {row.packaging !== "WITH_BOX" ? <Badge variant="outline">Bottle only</Badge> : null}
          </div>
          <p className="text-sm text-muted-foreground">{row.description}</p>
          <Separator />
          {row.type === "DECANT" ? (
            <div className="space-y-2">
              <p className="text-sm font-medium">Size</p>
              <div className="flex flex-wrap gap-2">
                {sizeOptions.map((option) => {
                  if (!("size" in option) || option.size == null) return null;
                  const href = option.skuId ? `/shop/${option.skuId}` : null;
                  const active = option.skuId === row.skuId;
                  const className = cn(
                    "inline-flex min-h-11 min-w-14 items-center justify-center rounded-full border px-4 text-sm",
                    active
                      ? "border-foreground bg-foreground text-background"
                      : href
                        ? "border-border hover:bg-muted"
                        : "cursor-not-allowed border-dashed text-muted-foreground",
                  );
                  if (!href) {
                    return (
                      <span key={option.size} className={className}>
                        {option.size}ml
                      </span>
                    );
                  }
                  return (
                    <Link key={option.size} href={href} className={className}>
                      {option.size}ml
                    </Link>
                  );
                })}
              </div>
            </div>
          ) : siblings.length > 1 ? (
            <div className="space-y-2">
              <p className="text-sm font-medium">Options</p>
              <div className="flex flex-wrap gap-2">
                {siblings.map((option) => (
                  <Link
                    key={option.id}
                    href={`/shop/${option.id}`}
                    className={cn(
                      "inline-flex min-h-11 items-center rounded-full border px-4 text-sm",
                      option.id === row.skuId
                        ? "border-foreground bg-foreground text-background"
                        : "border-border hover:bg-muted",
                    )}
                  >
                    {option.label}
                  </Link>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Size · {row.skuLabel}</p>
          )}
          <Price
            originalCentavos={row.retailPrice}
            discountedCentavos={discountedUnitCentavos}
            savedCentavos={perUnitDiscountCentavos}
          />
          {soldOut ? (
            <p className="text-sm text-destructive">Sold out — check back soon.</p>
          ) : (
            <div className="flex flex-wrap items-center gap-3">
              <AddToCartButton skuId={row.skuId} />
              <WishlistButton productId={row.productId} />
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
