import { notFound } from "next/navigation";
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { products, skus, productDiscounts, productImages, orders, orderItems } from "@/db/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SubmitButton } from "@/components/ui/submit-button";
import { ConfirmSubmitButton } from "@/components/ui/confirm-submit-button";
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
import { formatPHP, fromCentavos } from "@/domain/money";
import { isTerminal } from "@/domain/order-state";

export const dynamic = "force-dynamic";

function Field({
  label,
  htmlFor,
  className,
  children,
}: {
  label: string;
  htmlFor: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`space-y-1 ${className ?? ""}`}>
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
    </div>
  );
}

const selectClass = "h-11 w-full rounded-lg border bg-background px-3 text-sm";

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
  async function saveProduct(formData: FormData) {
    "use server";
    await upsertProduct(formData);
  }
  return (
    <div className="space-y-4">
      <h1 className="font-serif-display text-2xl">{product.name}</h1>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Product</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={saveProduct} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <input type="hidden" name="productId" value={product.id} />
            <Field label="Name" htmlFor="p-name">
              <Input id="p-name" name="name" defaultValue={product.name} required />
            </Field>
            <Field label="Brand" htmlFor="p-brand">
              <Input id="p-brand" name="brand" defaultValue={product.brand} required />
            </Field>
            <Field label="Family / accord" htmlFor="p-family">
              <Input id="p-family" name="family" defaultValue={product.family ?? ""} />
            </Field>
            <Field label="Type" htmlFor="p-type">
              <select id="p-type" name="type" defaultValue={product.type} className={selectClass}>
                <option value="DECANT">Decant</option>
                <option value="FULL_BOTTLE">Full bottle</option>
                <option value="PARTIAL">Partial</option>
              </select>
            </Field>
            <Field label="Shelf category" htmlFor="p-category">
              <select id="p-category" name="fragranceCategory" defaultValue={product.fragranceCategory} className={selectClass}>
                <option value="NICHE">Niche</option>
                <option value="DESIGNER">Designer</option>
                <option value="MIDDLE_EASTERN">Middle Eastern</option>
              </select>
            </Field>
            <Field label="Concentration" htmlFor="p-concentration">
              <select id="p-concentration" name="concentration" defaultValue={product.concentration ?? ""} className={selectClass}>
                <option value="">No concentration set</option>
                <option value="EAU_DE_COLOGNE">Eau de Cologne</option>
                <option value="EAU_DE_TOILETTE">Eau de Toilette</option>
                <option value="EAU_DE_PARFUM">Eau de Parfum</option>
                <option value="PARFUM">Parfum</option>
                <option value="EXTRAIT_DE_PARFUM">Extrait de Parfum</option>
              </select>
            </Field>
            <Field label="Reference size (ml)" htmlFor="p-sourceMl">
              <Input id="p-sourceMl" name="sourceMl" type="number" defaultValue={product.sourceMl ?? ""} placeholder="e.g. 100" />
            </Field>
            {product.type === "DECANT" ? (
              <Field label="Remaining in pool (ml)" htmlFor="p-remainingMl">
                <Input id="p-remainingMl" name="remainingMl" type="number" defaultValue={product.remainingMl ?? ""} placeholder="e.g. 80" />
              </Field>
            ) : null}
            <Field label="Cost price (₱, what you paid wholesale)" htmlFor="p-costPrice" className="sm:col-span-2">
              <Input
                id="p-costPrice"
                name="costPrice"
                type="number"
                step="0.01"
                defaultValue={product.costPrice != null ? fromCentavos(product.costPrice) : ""}
                placeholder="e.g. 3500 — add a period for centavos, e.g. 3500.50"
                required
              />
            </Field>
            <Field label="Pricing formula" htmlFor="p-pricingMode">
              <select id="p-pricingMode" name="pricingMode" defaultValue={product.pricingMode} className={selectClass}>
                <option value="PERCENTAGE">Percentage markup</option>
                <option value="FIXED">Fixed ₱ increment</option>
                <option value="DIRECT">Direct retail price</option>
              </select>
            </Field>
            <Field label="Markup % (or ₱ for fixed/direct)" htmlFor="p-pricingInput">
              <Input
                id="p-pricingInput"
                name="pricingInput"
                type="number"
                step="0.01"
                defaultValue={product.pricingMode === "PERCENTAGE" ? product.pricingInput : fromCentavos(product.pricingInput)}
              />
            </Field>
            <p className="text-xs text-muted-foreground sm:col-span-2">
              Reference retail price = cost price run through the formula above. Every SKU&apos;s price is derived from
              it: reference price ÷ reference size × that SKU&apos;s size — e.g. a ₱2,000 / 100ml reference prices a
              10ml decant at ₱200. A SKU without a size just uses the reference price directly. Cost price and the
              Fixed/Direct markup are entered in pesos (add a period for centavos, e.g. 3500.50) — not centavos.
            </p>
            <Field label="Description" htmlFor="p-description" className="sm:col-span-2">
              <Textarea id="p-description" name="description" defaultValue={product.description ?? ""} />
            </Field>
            <label className="flex items-center gap-2 text-sm sm:col-span-2">
              <input type="checkbox" name="isActive" defaultChecked={product.isActive} />
              Visible on storefront
            </label>
            <SubmitButton>Save product</SubmitButton>
          </form>
          {product.type === "DECANT" ? (
            <form action={adjustDecantMl} className="mt-4 flex flex-wrap items-end gap-2 border-t pt-4">
              <input type="hidden" name="productId" value={product.id} />
              <Field label="Remaining ml" htmlFor="adjust-ml">
                <Input id="adjust-ml" name="remainingMl" type="number" defaultValue={product.remainingMl ?? 0} />
              </Field>
              <Field label="Reason" htmlFor="adjust-note">
                <Input id="adjust-note" name="note" placeholder="e.g. damaged bottle, recount" />
              </Field>
              <SubmitButton>Adjust pool</SubmitButton>
            </form>
          ) : null}
          {product.type === "DECANT" ? (
            <p className="mt-3 text-xs text-muted-foreground">
              Availability per size (3/5/10/30ml) is derived from this pool: on hand once the pool is at or above the
              pre-order threshold and at or above that size, pre-order otherwise. Pool {product.remainingMl ?? 0}ml
              remaining · {pendingPreOrderMl}ml pending in open pre-orders.
            </p>
          ) : null}
          <form id="delete-product-form" action={archiveOrDeleteProduct} className="mt-4">
            <input type="hidden" name="productId" value={product.id} />
          </form>
          <ConfirmSubmitButton
            formId="delete-product-form"
            triggerLabel="Archive or delete"
            title={`Archive or delete "${product.name}"?`}
            description="If it has orders, cart entries, or wishlist saves, it's archived (hidden, kept for records). Otherwise it's deleted permanently. This can't be undone from here."
            confirmLabel="Archive or delete"
          />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">SKUs</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6 text-sm">
          {skuList.map((sku) => (
            <form action={upsertSku} key={sku.id} className="space-y-3 border-b pb-4">
              <input type="hidden" name="skuId" value={sku.id} />
              <input type="hidden" name="productId" value={product.id} />
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">{sku.label}</p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                <Field label="SKU code" htmlFor={`sku-code-${sku.id}`}>
                  <Input id={`sku-code-${sku.id}`} name="sku" defaultValue={sku.sku} />
                </Field>
                <Field label="Label" htmlFor={`sku-label-${sku.id}`}>
                  <Input id={`sku-label-${sku.id}`} name="label" defaultValue={sku.label} />
                </Field>
                <Field label="Size (ml)" htmlFor={`sku-size-${sku.id}`}>
                  <Input id={`sku-size-${sku.id}`} name="sizeMl" type="number" defaultValue={sku.sizeMl ?? ""} />
                </Field>
                <Field label="Fulfillment" htmlFor={`sku-fulfillment-${sku.id}`}>
                  <select id={`sku-fulfillment-${sku.id}`} name="fulfillment" defaultValue={sku.fulfillment} className={selectClass}>
                    <option value="ON_HAND">On hand</option>
                    <option value="PRE_ORDER">Pre-order</option>
                  </select>
                </Field>
                <Field label="Stock" htmlFor={`sku-stock-${sku.id}`}>
                  <Input id={`sku-stock-${sku.id}`} name="stock" type="number" defaultValue={sku.stock} />
                </Field>
                <Field label="Condition" htmlFor={`sku-condition-${sku.id}`}>
                  <select id={`sku-condition-${sku.id}`} name="condition" defaultValue={sku.condition} className={selectClass}>
                    <option value="BNIB">BNIB</option>
                    <option value="SEALED">Sealed</option>
                    <option value="FEW_SPRAYS_MISSING">Few sprays missing</option>
                    <option value="PARTIAL_ML">Partial ml</option>
                  </select>
                </Field>
                <Field label="Provenance" htmlFor={`sku-provenance-${sku.id}`}>
                  <select id={`sku-provenance-${sku.id}`} name="provenance" defaultValue={sku.provenance} className={selectClass}>
                    <option value="RETAIL">Retail</option>
                    <option value="TESTER">Tester</option>
                  </select>
                </Field>
                <Field label="Packaging" htmlFor={`sku-packaging-${sku.id}`}>
                  <select id={`sku-packaging-${sku.id}`} name="packaging" defaultValue={sku.packaging} className={selectClass}>
                    <option value="WITH_BOX">With box</option>
                    <option value="BOTTLE_ONLY">Bottle only</option>
                  </select>
                </Field>
              </div>
              <p className="text-xs text-muted-foreground">Computed retail price: {formatPHP(sku.retailPrice)}</p>
              <div className="flex flex-wrap items-center gap-4">
                <label className="flex items-center gap-2 text-xs">
                  <input type="checkbox" name="isTester" defaultChecked={sku.isTester} /> Tester
                </label>
                <label className="flex items-center gap-2 text-xs">
                  <input type="checkbox" name="isActive" defaultChecked={sku.isActive} /> Active
                </label>
                <SubmitButton>Save SKU</SubmitButton>
              </div>
            </form>
          ))}
          {skuList.map((sku) => (
            <div key={`${sku.id}-del`}>
              <form id={`delete-sku-form-${sku.id}`} action={archiveOrDeleteSku}>
                <input type="hidden" name="skuId" value={sku.id} />
                <input type="hidden" name="productId" value={product.id} />
              </form>
              <ConfirmSubmitButton
                formId={`delete-sku-form-${sku.id}`}
                triggerLabel={`Archive or delete ${sku.label}`}
                triggerVariant="outline"
                title={`Archive or delete "${sku.label}"?`}
                description="If it has orders or cart entries, it's archived (hidden, kept for records). Otherwise it's deleted permanently."
                confirmLabel="Archive or delete"
              />
            </div>
          ))}
          <div className="space-y-3 border-t pt-4">
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">Add a SKU</p>
            <form action={upsertSku} className="space-y-3">
              <input type="hidden" name="productId" value={product.id} />
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                <Field label="SKU code" htmlFor="new-sku-code">
                  <Input id="new-sku-code" name="sku" placeholder="e.g. BRAND-NAME-100" required />
                </Field>
                <Field label="Label" htmlFor="new-sku-label">
                  <Input id="new-sku-label" name="label" placeholder="e.g. 100ml Eau de Parfum" required />
                </Field>
                <Field label="Size (ml)" htmlFor="new-sku-size">
                  <Input id="new-sku-size" name="sizeMl" type="number" placeholder="e.g. 10 — price derives from the product formula above" />
                </Field>
                <Field label="Fulfillment" htmlFor="new-sku-fulfillment">
                  <select id="new-sku-fulfillment" name="fulfillment" defaultValue="ON_HAND" className={selectClass}>
                    <option value="ON_HAND">On hand</option>
                    <option value="PRE_ORDER">Pre-order</option>
                  </select>
                </Field>
                <Field label="Stock" htmlFor="new-sku-stock">
                  <Input id="new-sku-stock" name="stock" type="number" defaultValue={0} />
                </Field>
                <Field label="Condition" htmlFor="new-sku-condition">
                  <select id="new-sku-condition" name="condition" defaultValue="SEALED" className={selectClass}>
                    <option value="BNIB">BNIB</option>
                    <option value="SEALED">Sealed</option>
                    <option value="FEW_SPRAYS_MISSING">Few sprays missing</option>
                    <option value="PARTIAL_ML">Partial ml</option>
                  </select>
                </Field>
                <Field label="Provenance" htmlFor="new-sku-provenance">
                  <select id="new-sku-provenance" name="provenance" defaultValue="RETAIL" className={selectClass}>
                    <option value="RETAIL">Retail</option>
                    <option value="TESTER">Tester</option>
                  </select>
                </Field>
                <Field label="Packaging" htmlFor="new-sku-packaging">
                  <select id="new-sku-packaging" name="packaging" defaultValue="WITH_BOX" className={selectClass}>
                    <option value="WITH_BOX">With box</option>
                    <option value="BOTTLE_ONLY">Bottle only</option>
                  </select>
                </Field>
              </div>
              <div className="flex flex-wrap items-center gap-4">
                <label className="flex items-center gap-2 text-xs">
                  <input type="checkbox" name="isActive" defaultChecked /> Active
                </label>
                <SubmitButton>Add SKU</SubmitButton>
              </div>
            </form>
          </div>
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
            <Field label="Image file" htmlFor="new-image-file">
              <Input id="new-image-file" name="file" type="file" accept="image/jpeg,image/png,image/webp" required />
            </Field>
            <Field label="Alt text" htmlFor="new-image-alt">
              <Input id="new-image-alt" name="alt" placeholder="e.g. Brand — Perfume name" />
            </Field>
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
          <form action={upsertDiscount} className="flex flex-wrap items-end gap-2">
            <input type="hidden" name="productId" value={product.id} />
            <Field label="Type" htmlFor="new-discount-type">
              <select id="new-discount-type" name="type" className={selectClass}>
                <option value="PERCENTAGE">Percentage</option>
                <option value="FIXED">Fixed ₱ off</option>
              </select>
            </Field>
            <Field label="Amount (% or ₱)" htmlFor="new-discount-amount">
              <Input id="new-discount-amount" name="amount" type="number" step="0.01" required className="w-32" />
            </Field>
            <SubmitButton>Add discount</SubmitButton>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
