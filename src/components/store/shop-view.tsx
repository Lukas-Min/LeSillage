import Link from "next/link";
import { and, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/db/client";
import {
  products,
  skus,
  productImages,
  productDiscounts,
  type FragranceCategory,
} from "@/db/schema";
import { applyDiscount, bestDiscount } from "@/domain/discount";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Price } from "@/components/store/price";

interface Filter {
  fragranceCategory?: FragranceCategory;
  brand?: string;
}

interface ShopViewProps {
  title: string;
  subtitle?: string;
  filter: Filter;
}

export async function ShopView({ title, subtitle, filter }: ShopViewProps) {
  const client = db();
  const conditions = [eq(products.isActive, true)];
  if (filter.fragranceCategory) {
    conditions.push(eq(products.fragranceCategory, filter.fragranceCategory));
  }
  if (filter.brand) {
    conditions.push(eq(products.brand, filter.brand));
  }
  const productRows = await client
    .select({
      id: products.id,
      name: products.name,
      brand: products.brand,
      family: products.family,
    })
    .from(products)
    .where(and(...conditions))
    .orderBy(desc(products.createdAt));
  if (productRows.length === 0) {
    return (
      <main className="mx-auto w-full max-w-6xl px-4 py-12">
        <h1 className="font-serif-display text-2xl">{title}</h1>
        {subtitle ? <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p> : null}
        <p className="mt-12 text-sm text-muted-foreground">No items match this filter yet.</p>
      </main>
    );
  }
  const productIds = productRows.map((p) => p.id);
  const [skuRows, imageRows, discountRows] = await Promise.all([
    client
      .select({
        productId: skus.productId,
        skuId: skus.id,
        retailPrice: skus.retailPrice,
        fulfillment: skus.fulfillment,
        stock: skus.stock,
        condition: skus.condition,
      })
      .from(skus)
      .where(and(eq(skus.isActive, true), eq(skus.isTester, false))),
    client
      .select({ productId: productImages.productId, url: productImages.url })
      .from(productImages)
      .where(inArray(productImages.productId, productIds)),
    client
      .select()
      .from(productDiscounts)
      .where(inArray(productDiscounts.productId, productIds)),
  ]);
  const skusByProduct = new Map<string, typeof skuRows>();
  for (const sku of skuRows) {
    const arr = skusByProduct.get(sku.productId) ?? [];
    arr.push(sku);
    skusByProduct.set(sku.productId, arr);
  }
  const imageByProduct = new Map<string, string>();
  for (const img of imageRows) imageByProduct.set(img.productId, img.url);
  const discountsByProduct = new Map<string, typeof discountRows>();
  for (const d of discountRows) {
    const arr = discountsByProduct.get(d.productId) ?? [];
    arr.push(d);
    discountsByProduct.set(d.productId, arr);
  }

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:py-12">
      <header className="mb-6 flex flex-col gap-2">
        <h1 className="font-serif-display text-2xl sm:text-3xl">{title}</h1>
        {subtitle ? <p className="text-sm text-muted-foreground">{subtitle}</p> : null}
      </header>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 md:gap-6">
        {productRows.map((row) => {
          const variants = skusByProduct.get(row.id) ?? [];
          const sku = variants
            .filter((v) => v.fulfillment === "ON_HAND")
            .sort((a, b) => a.retailPrice - b.retailPrice)[0] ?? variants[0];
          if (!sku) return null;
          const { discountedUnitCentavos, perUnitDiscountCentavos } = applyDiscount(
            sku.retailPrice,
            bestDiscount(discountsByProduct.get(row.id) ?? [], sku.retailPrice),
          );
          return (
            <Card key={row.id} className="overflow-hidden">
              <CardHeader className="p-0">
                <div className="aspect-[4/5] w-full bg-cream-foreground/5">
                  {imageByProduct.get(row.id) ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={imageByProduct.get(row.id)!} alt={row.name} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-xs uppercase tracking-widest text-muted-foreground">
                      {row.brand}
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-1 p-4">
                <p className="text-xs uppercase tracking-widest text-muted-foreground">{row.brand}</p>
                <CardTitle className="font-serif-display text-lg">{row.name}</CardTitle>
                <p className="text-xs text-muted-foreground">{row.family}</p>
                <div className="flex flex-wrap gap-1 pt-2">
                  <Badge variant={sku.fulfillment === "PRE_ORDER" ? "outline" : "secondary"}>
                    {sku.fulfillment === "PRE_ORDER" ? "Pre-order" : "On hand"}
                  </Badge>
                  {sku.fulfillment === "ON_HAND" && sku.stock <= 0 ? (
                    <Badge variant="destructive">Sold out</Badge>
                  ) : null}
                </div>
              </CardContent>
              <CardFooter className="flex items-center justify-between p-4 pt-0">
                <Price
                  originalCentavos={sku.retailPrice}
                  discountedCentavos={discountedUnitCentavos}
                  savedCentavos={perUnitDiscountCentavos}
                />
                <Link
                  href={`/shop/${sku.skuId}`}
                  className="text-sm font-medium underline-offset-4 hover:underline"
                >
                  View
                </Link>
              </CardFooter>
            </Card>
          );
        })}
      </div>
    </main>
  );
}
