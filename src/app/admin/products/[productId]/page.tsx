import { notFound } from "next/navigation";
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { products, skus, productDiscounts, productImages, orders, orderItems } from "@/db/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SubmitButton } from "@/components/ui/submit-button";
import {
  adjustDecantMl,
  archiveOrDeleteProduct,
  archiveOrDeleteSku,
  removeProductImage,
  uploadProductImage,
  upsertDiscount,
  upsertProduct,
  upsertSku,
} from "@/actions/admin-catalog-actions";
import { formatPHP } from "@/domain/money";
import { isTerminal } from "@/domain/order-state";

export const dynamic = "force-dynamic";

export default async function AdminProductDetailPage({
  params,
}: {
  params: Promise<{ productId: string }>;
}) {
  const { productId } = await params;
  const product = (await db().select().from(products).where(eq(products.id, productId)))[0];
  if (!product) return notFound();
  const [skuList, discountList, imageList] = await Promise.all([
    db().select().from(skus).where(eq(skus.productId, productId)).orderBy(asc(skus.label)),
    db().select().from(productDiscounts).where(eq(productDiscounts.productId, productId)),
    db().select().from(productImages).where(eq(productImages.productId, productId)),
  ]);
  let pendingPreOrderMl = 0;
  if (product.type === "DECANT" && skuList.length > 0) {
    const pendingRows = await db()
      .select({
        quantity: orderItems.quantity,
        sizeMl: skus.sizeMl,
        status: orders.status,
      })
      .from(orderItems)
      .innerJoin(orders, eq(orders.id, orderItems.orderId))
      .innerJoin(skus, eq(skus.id, orderItems.skuId))
      .where(and(eq(skus.productId, productId), eq(orderItems.fulfillment, "PRE_ORDER")));
    pendingPreOrderMl = pendingRows
      .filter((row) => !isTerminal(row.status))
      .reduce((sum, row) => sum + row.quantity * (row.sizeMl ?? 0), 0);
  }
  return (
    <div className="space-y-4">
      <h1 className="font-serif-display text-2xl">{product.name}</h1>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Product</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={upsertProduct} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <input type="hidden" name="productId" value={product.id} />
            <Input name="name" defaultValue={product.name} required />
            <Input name="brand" defaultValue={product.brand} required />
            <Input name="family" defaultValue={product.family ?? ""} />
            <select name="type" defaultValue={product.type} className="h-11 rounded-lg border bg-background px-3 text-sm">
              <option value="DECANT">Decant</option>
              <option value="FULL_BOTTLE">Full bottle</option>
              <option value="PARTIAL">Partial</option>
            </select>
            <select name="fragranceCategory" defaultValue={product.fragranceCategory} className="h-11 rounded-lg border bg-background px-3 text-sm">
              <option value="NICHE">Niche</option>
              <option value="DESIGNER">Designer</option>
              <option value="MIDDLE_EASTERN">Middle Eastern</option>
            </select>
            <select name="concentration" defaultValue={product.concentration ?? ""} className="h-11 rounded-lg border bg-background px-3 text-sm">
              <option value="">No concentration set</option>
              <option value="EAU_DE_COLOGNE">Eau de Cologne</option>
              <option value="EAU_DE_TOILETTE">Eau de Toilette</option>
              <option value="EAU_DE_PARFUM">Eau de Parfum</option>
              <option value="PARFUM">Parfum</option>
              <option value="EXTRAIT_DE_PARFUM">Extrait de Parfum</option>
            </select>
            <Input name="sourceMl" type="number" defaultValue={product.sourceMl ?? ""} placeholder="Source ml" />
            <Input name="remainingMl" type="number" defaultValue={product.remainingMl ?? ""} placeholder="Remaining ml" />
            <Textarea name="description" defaultValue={product.description ?? ""} className="sm:col-span-2" />
            <label className="flex items-center gap-2 text-sm sm:col-span-2">
              <input type="checkbox" name="isActive" defaultChecked={product.isActive} />
              Visible on storefront
            </label>
            <SubmitButton>Save product</SubmitButton>
          </form>
          {product.type === "DECANT" ? (
            <form action={adjustDecantMl} className="mt-4 flex flex-wrap items-end gap-2">
              <input type="hidden" name="productId" value={product.id} />
              <div>
                <Label htmlFor="ml">Remaining ml</Label>
                <Input id="ml" name="remainingMl" type="number" defaultValue={product.remainingMl ?? 0} />
              </div>
              <Input name="note" placeholder="Reason" />
              <SubmitButton>Adjust pool</SubmitButton>
            </form>
          ) : null}
          {product.type === "DECANT" ? (
            <p className="mt-3 text-xs text-muted-foreground">
              Pool {product.remainingMl ?? 0}ml remaining · {pendingPreOrderMl}ml pending in open pre-orders
            </p>
          ) : null}
          <form action={archiveOrDeleteProduct} className="mt-4">
            <input type="hidden" name="productId" value={product.id} />
            <SubmitButton variant="destructive">Archive or delete</SubmitButton>
          </form>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">SKUs</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6 text-sm">
          {skuList.map((sku) => (
            <form action={upsertSku} key={sku.id} className="grid grid-cols-1 gap-2 border-b pb-4 sm:grid-cols-3">
              <input type="hidden" name="skuId" value={sku.id} />
              <input type="hidden" name="productId" value={product.id} />
              <Input name="sku" defaultValue={sku.sku} />
              <Input name="label" defaultValue={sku.label} />
              <Input name="sizeMl" type="number" defaultValue={sku.sizeMl ?? ""} />
              <Input name="costPrice" type="number" defaultValue={sku.costPrice} />
              <select name="pricingMode" defaultValue={sku.pricingMode} className="h-9 rounded-lg border bg-background px-2">
                <option value="PERCENTAGE">Percentage</option>
                <option value="FIXED">Fixed</option>
                <option value="DIRECT">Direct</option>
              </select>
              <Input name="pricingInput" type="number" defaultValue={sku.pricingInput} />
              <select name="fulfillment" defaultValue={sku.fulfillment} className="h-9 rounded-lg border bg-background px-2">
                <option value="ON_HAND">On hand</option>
                <option value="PRE_ORDER">Pre-order</option>
              </select>
              <Input name="stock" type="number" defaultValue={sku.stock} />
              <select name="condition" defaultValue={sku.condition} className="h-9 rounded-lg border bg-background px-2">
                <option value="BNIB">BNIB</option>
                <option value="SEALED">Sealed</option>
                <option value="FEW_SPRAYS_MISSING">Few sprays missing</option>
                <option value="PARTIAL_ML">Partial ml</option>
              </select>
              <select name="provenance" defaultValue={sku.provenance} className="h-9 rounded-lg border bg-background px-2">
                <option value="RETAIL">Retail</option>
                <option value="TESTER">Tester</option>
              </select>
              <select name="packaging" defaultValue={sku.packaging} className="h-9 rounded-lg border bg-background px-2">
                <option value="WITH_BOX">With box</option>
                <option value="BOTTLE_ONLY">Bottle only</option>
              </select>
              <p className="text-xs text-muted-foreground sm:col-span-3">Retail {formatPHP(sku.retailPrice)}</p>
              <label className="flex items-center gap-2 text-xs">
                <input type="checkbox" name="isTester" defaultChecked={sku.isTester} /> Tester
              </label>
              <label className="flex items-center gap-2 text-xs">
                <input type="checkbox" name="isActive" defaultChecked={sku.isActive} /> Active
              </label>
              <SubmitButton>Save SKU</SubmitButton>
            </form>
          ))}
          {skuList.map((sku) => (
            <form action={archiveOrDeleteSku} key={`${sku.id}-del`}>
              <input type="hidden" name="skuId" value={sku.id} />
              <input type="hidden" name="productId" value={product.id} />
              <SubmitButton variant="outline">Archive or delete {sku.label}</SubmitButton>
            </form>
          ))}
          <form action={upsertSku} className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <input type="hidden" name="productId" value={product.id} />
            <Input name="sku" placeholder="SKU code" required />
            <Input name="label" placeholder="Label" required />
            <Input name="sizeMl" type="number" placeholder="Size ml" />
            <Input name="costPrice" type="number" placeholder="Cost centavos" required />
            <select name="pricingMode" defaultValue="PERCENTAGE" className="h-9 rounded-lg border bg-background px-2">
              <option value="PERCENTAGE">Percentage</option>
              <option value="FIXED">Fixed</option>
              <option value="DIRECT">Direct</option>
            </select>
            <Input name="pricingInput" type="number" defaultValue={60} />
            <select name="fulfillment" defaultValue="ON_HAND" className="h-9 rounded-lg border bg-background px-2">
              <option value="ON_HAND">On hand</option>
              <option value="PRE_ORDER">Pre-order</option>
            </select>
            <Input name="stock" type="number" defaultValue={0} />
            <select name="condition" defaultValue="SEALED" className="h-9 rounded-lg border bg-background px-2">
              <option value="BNIB">BNIB</option>
              <option value="SEALED">Sealed</option>
              <option value="FEW_SPRAYS_MISSING">Few sprays missing</option>
              <option value="PARTIAL_ML">Partial ml</option>
            </select>
            <select name="provenance" defaultValue="RETAIL" className="h-9 rounded-lg border bg-background px-2">
              <option value="RETAIL">Retail</option>
              <option value="TESTER">Tester</option>
            </select>
            <select name="packaging" defaultValue="WITH_BOX" className="h-9 rounded-lg border bg-background px-2">
              <option value="WITH_BOX">With box</option>
              <option value="BOTTLE_ONLY">Bottle only</option>
            </select>
            <label className="flex items-center gap-2 text-xs">
              <input type="checkbox" name="isActive" defaultChecked /> Active
            </label>
            <SubmitButton>Add SKU</SubmitButton>
          </form>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Images</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {imageList.map((image) => (
            <form action={removeProductImage} key={image.id} className="flex items-center justify-between gap-2">
              <p className="truncate text-xs">{image.url}</p>
              <input type="hidden" name="imageId" value={image.id} />
              <input type="hidden" name="productId" value={product.id} />
              <SubmitButton variant="outline">Remove</SubmitButton>
            </form>
          ))}
          <form action={uploadProductImage} className="space-y-2">
            <input type="hidden" name="productId" value={product.id} />
            <Input name="file" type="file" accept="image/jpeg,image/png,image/webp" required />
            <Input name="alt" placeholder="Alt text" />
            <SubmitButton>Upload image</SubmitButton>
          </form>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Discounts</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {discountList.map((d) => (
            <p key={d.id}>
              {d.type === "PERCENTAGE" ? `${d.amount}%` : `₱${(d.amount / 100).toFixed(2)} off`} — {d.isActive ? "active" : "inactive"}
            </p>
          ))}
          <form action={upsertDiscount} className="flex flex-wrap gap-2">
            <input type="hidden" name="productId" value={product.id} />
            <select name="type" className="h-9 rounded-lg border bg-background px-2">
              <option value="PERCENTAGE">Percentage</option>
              <option value="FIXED">Fixed centavos</option>
            </select>
            <Input name="amount" type="number" required className="w-32" />
            <SubmitButton>Add discount</SubmitButton>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
