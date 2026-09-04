import { notFound } from "next/navigation";
import { Trash2 } from "lucide-react";
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { products, skus, productDiscounts, productImages, orders, orderItems } from "@/db/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SubmitButton } from "@/components/ui/submit-button";
import { ConfirmSubmitButton } from "@/components/ui/confirm-submit-button";
import { DecantSkuFields } from "@/components/admin/decant-sku-fields";
import {
  addProductImage,
  adjustDecantMl,
  archiveOrDeleteProduct,
  archiveOrDeleteSku,
  removeProductImage,
  upsertDiscount,
  upsertProduct,
  upsertSku,
} from "@/actions/admin-catalog-actions";
import { formatPHP, fromCentavos } from "@/domain/money";
import { isTerminal } from "@/domain/order-state";
import { labelForType } from "@/domain/product-type";

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
          <form id="save-product-form" action={saveProduct} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <input type="hidden" name="productId" value={product.id} />
            <Field label="Name" htmlFor="p-name">
              <Input id="p-name" name="name" defaultValue={product.name} required />
            </Field>
            <Field label="Brand" htmlFor="p-brand">
              <Input id="p-brand" name="brand" defaultValue={product.brand} required />
            </Field>
            {/* Family is sourced from the Fragrantica import, not hand-typed —
                kept as a hidden field so saving the rest of the form doesn't
                blow it away, per the user: not editable here. */}
            <input type="hidden" name="family" value={product.family ?? ""} />
            <Field label="Gender" htmlFor="p-gender">
              <select id="p-gender" name="gender" defaultValue={product.gender ?? ""} className={selectClass}>
                <option value="">Not set</option>
                <option value="men">Men</option>
                <option value="women">Women</option>
                <option value="unisex">Unisex</option>
              </select>
            </Field>
            {/* Type is fixed at creation — existing SKUs assume this field set. */}
            <input type="hidden" name="type" value={product.type} />
            <Field label="Type" htmlFor="p-type-readonly">
              <p id="p-type-readonly" className="flex h-11 items-center rounded-lg border bg-muted/40 px-3 text-sm text-muted-foreground">
                {labelForType(product.type)}
              </p>
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
            {/* Remaining ml has exactly one editable control on this page — the
                "Adjust pool" form below (it also logs a reason). Saving this
                form must not silently reset it, so it rides along hidden; this
                read-only view next to Reference size is just for quick
                at-a-glance visibility without scrolling down to Adjust pool. */}
            {product.type === "DECANT" ? (
              <>
                <input type="hidden" name="remainingMl" value={product.remainingMl ?? 0} />
                <Field label="Remaining ml" htmlFor="p-remainingMl-readonly">
                  <p id="p-remainingMl-readonly" className="flex h-11 items-center rounded-lg border bg-muted/40 px-3 text-sm text-muted-foreground">
                    {product.remainingMl ?? 0}ml
                  </p>
                </Field>
              </>
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
          </form>
          {product.type === "DECANT" ? (
            <form action={adjustDecantMl} className="mt-4 flex flex-wrap items-end gap-2 border-t pt-4">
              <input type="hidden" name="productId" value={product.id} />
              <Field label="Remaining ml" htmlFor="adjust-ml" className="flex-1">
                <Input id="adjust-ml" name="remainingMl" type="number" defaultValue={product.remainingMl ?? 0} />
              </Field>
              <Field label="Reason" htmlFor="adjust-note" className="flex-1">
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
          <form id="delete-product-form" action={archiveOrDeleteProduct}>
            <input type="hidden" name="productId" value={product.id} />
          </form>
          <div className="mt-4 flex gap-2">
            <SubmitButton form="save-product-form" className="flex-1">
              Save product
            </SubmitButton>
            <ConfirmSubmitButton
              formId="delete-product-form"
              triggerLabel="Archive or delete"
              triggerClassName="flex-1"
              title={`Archive or delete "${product.name}"?`}
              description="If it has orders, cart entries, or wishlist saves, it's archived (hidden, kept for records). Otherwise it's deleted permanently. This can't be undone from here."
              confirmLabel="Archive or delete"
            />
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">SKUs</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6 text-sm">
          {skuList.map((sku) => (
            <div key={sku.id} className="space-y-3 border-b pb-4">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">{sku.label}</p>
              <ConfirmSubmitButton
                formId={`delete-sku-form-${sku.id}`}
                triggerLabel={<Trash2 className="h-4 w-4" />}
                triggerVariant="destructive"
                triggerSize="icon-sm"
                triggerAriaLabel={`Archive or delete ${sku.label}`}
                title={`Archive or delete "${sku.label}"?`}
                description="If it has orders or cart entries, it's archived (hidden, kept for records). Otherwise it's deleted permanently."
                confirmLabel="Archive or delete"
              />
            </div>
            <form action={upsertSku} className="space-y-3">
              <input type="hidden" name="skuId" value={sku.id} />
              <input type="hidden" name="productId" value={product.id} />
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                {/* SKU code is system-generated once at creation (see
                    generateSkuCode in admin-catalog-actions.ts) and never
                    editable afterward — shown as plain text, not submitted. */}
                <Field label="SKU code" htmlFor={`sku-code-${sku.id}`}>
                  <p id={`sku-code-${sku.id}`} className="flex h-11 items-center truncate rounded-lg border bg-muted/40 px-3 text-sm text-muted-foreground">
                    {sku.sku}
                  </p>
                </Field>
                <Field label="Label" htmlFor={`sku-label-${sku.id}`}>
                  <Input id={`sku-label-${sku.id}`} name="label" defaultValue={sku.label} />
                </Field>
                <Field label="Size (ml)" htmlFor={`sku-size-${sku.id}`}>
                  <Input id={`sku-size-${sku.id}`} name="sizeMl" type="number" defaultValue={sku.sizeMl ?? ""} />
                </Field>
                {product.type === "DECANT" ? (
                  <>
                    {/* A decant bottle isn't "Sealed"/"BNIB", and isn't sold
                        "with box"/"bottle only" — both only describe a
                        specific full-bottle/partial unit. Preserved as
                        hidden fields so saving doesn't erase them. */}
                    <input type="hidden" name="condition" value={sku.condition} />
                    <input type="hidden" name="packaging" value={sku.packaging} />
                    <DecantSkuFields
                      idPrefix={`sku-${sku.id}`}
                      initialProvenance={sku.provenance === "TESTER" ? "IN_HOUSE" : sku.provenance}
                      fulfillment={sku.fulfillment}
                      stock={sku.stock}
                      costPrice={fromCentavos(sku.costPrice)}
                      pricingMode={sku.pricingMode}
                      pricingInput={sku.pricingInput}
                    />
                  </>
                ) : (
                  <>
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
                  </>
                )}
              </div>
              <p className="text-xs text-muted-foreground">Computed retail price: {formatPHP(sku.retailPrice)}</p>
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex flex-wrap items-center gap-4">
                  {product.type === "DECANT" ? (
                    // Testers are a full-bottle/partial concept — a decant
                    // isn't given away as a bonus unit, so this doesn't
                    // apply. Preserved as a hidden field either way.
                    <input type="hidden" name="isTester" value={sku.isTester ? "on" : ""} />
                  ) : (
                    <label className="flex items-center gap-2 text-xs">
                      <input type="checkbox" name="isTester" defaultChecked={sku.isTester} /> Tester
                    </label>
                  )}
                  <label className="flex items-center gap-2 text-xs">
                    <input type="checkbox" name="isActive" defaultChecked={sku.isActive} /> Active
                  </label>
                </div>
                <SubmitButton>Save SKU</SubmitButton>
              </div>
            </form>
              <form id={`delete-sku-form-${sku.id}`} action={archiveOrDeleteSku}>
                <input type="hidden" name="skuId" value={sku.id} />
                <input type="hidden" name="productId" value={product.id} />
              </form>
            </div>
          ))}
          <div className="space-y-3 border-t pt-4">
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">Add a SKU</p>
            <form action={upsertSku} className="space-y-3">
              <input type="hidden" name="productId" value={product.id} />
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                <Field label="SKU code" htmlFor="new-sku-code">
                  <p id="new-sku-code" className="flex h-11 items-center rounded-lg border bg-muted/40 px-3 text-sm text-muted-foreground">
                    Generated on save
                  </p>
                </Field>
                <Field label="Label" htmlFor="new-sku-label">
                  <Input id="new-sku-label" name="label" placeholder="e.g. 100ml Eau de Parfum" required />
                </Field>
                <Field label="Size (ml)" htmlFor="new-sku-size">
                  <Input id="new-sku-size" name="sizeMl" type="number" placeholder="e.g. 10 — price derives from the product formula above" />
                </Field>
                {product.type === "DECANT" ? (
                  <>
                    <input type="hidden" name="condition" value="SEALED" />
                    <input type="hidden" name="packaging" value="BOTTLE_ONLY" />
                    <DecantSkuFields
                      idPrefix="new-sku"
                      initialProvenance="IN_HOUSE"
                      fulfillment="ON_HAND"
                      stock={0}
                      costPrice={0}
                      pricingMode="PERCENTAGE"
                      pricingInput={30}
                    />
                  </>
                ) : (
                  <>
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
                  </>
                )}
              </div>
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex flex-wrap items-center gap-4">
                  {product.type === "DECANT" ? (
                    <input type="hidden" name="isTester" value="" />
                  ) : (
                    <label className="flex items-center gap-2 text-xs">
                      <input type="checkbox" name="isTester" /> Tester
                    </label>
                  )}
                  <label className="flex items-center gap-2 text-xs">
                    <input type="checkbox" name="isActive" defaultChecked /> Active
                  </label>
                </div>
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
          <form action={addProductImage} className="space-y-2 border-t pt-3">
            <input type="hidden" name="productId" value={product.id} />
            <Field label="Image file" htmlFor="new-image-file">
              <Input id="new-image-file" name="file" type="file" accept="image/jpeg,image/png,image/webp" />
            </Field>
            <Field label="Or paste an image URL instead" htmlFor="new-image-url">
              <Input id="new-image-url" name="url" type="url" placeholder="https://…" />
            </Field>
            <Field label="Alt text" htmlFor="new-image-alt">
              <Input id="new-image-alt" name="alt" placeholder="e.g. Brand — Perfume name" />
            </Field>
            <SubmitButton>Add image</SubmitButton>
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
            <Field label="Type" htmlFor="new-discount-type" className="min-w-[9rem] flex-1">
              <select id="new-discount-type" name="type" className={selectClass}>
                <option value="PERCENTAGE">Percentage</option>
                <option value="FIXED">Fixed ₱ off</option>
              </select>
            </Field>
            <Field label="Amount (% or ₱)" htmlFor="new-discount-amount" className="min-w-[9rem] flex-1">
              <Input id="new-discount-amount" name="amount" type="number" step="0.01" required />
            </Field>
            <SubmitButton>Add discount</SubmitButton>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
