import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { products, skus, productImages, productDiscounts } from "@/db/schema";
import { applyDiscount, bestDiscount } from "@/domain/discount";
import { Badge } from "@/components/ui/badge";
import { AddToCartButton } from "@/components/store/add-to-cart-button";
import { Price } from "@/components/store/price";
import { Separator } from "@/components/ui/separator";

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
        condition: skus.condition,
        provenance: skus.provenance,
        packaging: skus.packaging,
        skuId: skus.id,
        skuLabel: skus.label,
        retailPrice: skus.retailPrice,
        fulfillment: skus.fulfillment,
        stock: skus.stock,
        isTester: skus.isTester,
        imageUrl: productImages.url,
      })
      .from(skus)
      .innerJoin(products, eq(products.id, skus.productId))
      .leftJoin(productImages, eq(productImages.productId, products.id))
      .where(eq(skus.id, skuId))
  )[0];
  if (!row) return notFound();
  const discounts = await client
    .select()
    .from(productDiscounts)
    .where(eq(productDiscounts.productId, row.productId));
  const discount = bestDiscount(discounts, row.retailPrice);
  const { discountedUnitCentavos, perUnitDiscountCentavos } = applyDiscount(
    row.retailPrice,
    discount,
  );

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8">
      <Link href="/shop" className="text-sm text-muted-foreground hover:underline">
        ← Back to catalog
      </Link>
      <div className="mt-4 grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div className="aspect-square w-full overflow-hidden rounded-2xl bg-cream-foreground/5">
          {row.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={row.imageUrl} alt={row.name} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full items-center justify-center text-xs uppercase tracking-widest text-muted-foreground">
              {row.brand}
            </div>
          )}
        </div>
        <div className="space-y-4">
          <p className="text-xs uppercase tracking-[0.4em] text-gold">{row.brand}</p>
          <h1 className="font-serif-display text-2xl">{row.name}</h1>
          <div className="flex flex-wrap gap-2">
            <Badge variant={row.fulfillment === "PRE_ORDER" ? "outline" : "secondary"}>
              {row.fulfillment === "PRE_ORDER" ? "Pre-order · 3 to 30 days" : "On hand · 1 to 2 days"}
            </Badge>
            {row.fulfillment === "ON_HAND" && row.stock <= 0 ? (
              <Badge variant="destructive">Sold out</Badge>
            ) : null}
            {row.condition !== "BNIB" ? (
              <Badge variant="outline">{labelForCondition(row.condition)}</Badge>
            ) : null}
            {row.provenance !== "RETAIL" ? (
              <Badge variant="outline">{row.provenance}</Badge>
            ) : null}
            {row.packaging !== "WITH_BOX" ? (
              <Badge variant="outline">Bottle only</Badge>
            ) : null}
          </div>
          <p className="text-sm text-muted-foreground">{row.description}</p>
          <Separator />
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Size · {row.skuLabel}</p>
            <Price
              originalCentavos={row.retailPrice}
              discountedCentavos={discountedUnitCentavos}
              savedCentavos={perUnitDiscountCentavos}
              className="font-serif-display text-2xl"
            />
          </div>
          {row.fulfillment === "ON_HAND" && row.stock <= 0 ? (
            <p className="text-sm text-destructive">Sold out — check back soon.</p>
          ) : (
            <AddToCartButton
              skuId={row.skuId}
              name={row.name}
              skuLabel={row.skuLabel}
              retailPriceCentavos={discountedUnitCentavos}
              fulfillment={row.fulfillment}
              productType={row.type}
            />
          )}
        </div>
      </div>
    </main>
  );
}

function labelForCondition(c: typeof skus.$inferSelect.condition): string {
  switch (c) {
    case "BNIB":
      return "Brand new in box";
    case "SEALED":
      return "Sealed";
    case "FEW_SPRAYS_MISSING":
      return "A few sprays missing";
    case "PARTIAL_ML":
      return "Partial · ml only";
  }
}
