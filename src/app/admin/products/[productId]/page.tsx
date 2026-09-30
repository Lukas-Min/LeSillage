import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink, Trash2 } from "lucide-react";
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { products, skus, productDiscounts, productImages, orders, orderItems } from "@/db/schema";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AreaHeader, PAGE_ACTION_CLASS } from "@/components/ui/page-layout";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SubmitButton } from "@/components/ui/submit-button";
import { ConfirmSubmitButton } from "@/components/ui/confirm-submit-button";
import { DecantSkuFields } from "@/components/admin/decant-sku-fields";
import { TesterToggle } from "@/components/admin/tester-toggle";
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
import { labelForCategory, labelForType } from "@/domain/product-type";
import { formatPhDateBoundary, todayPhDateString, toDisplayDate } from "@/domain/ph-date";
import { formatDate } from "@/lib/utils";
import { FORM_ACTION_CLASS } from "@/components/ui/form-action";

export const dynamic = "force-dynamic";

/** A titled group of fields inside one form (Details, Pricing). */
function FormSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="min-w-0 space-y-3">
      <legend className="mb-3 text-[11px] uppercase tracking-[0.28em] text-muted-foreground">{title}</legend>
      {children}
    </fieldset>
  );
}

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

const selectClass = "h-11 w-full rounded-lg border bg-background px-3 text-base md:text-sm";

export default async function AdminProductDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ productId: string }>;
  searchParams: Promise<{ welcome?: string }>;
}) {
  const { productId } = await params;
  const { welcome } = await searchParams;
  const product = (await db().select().from(products).where(eq(products.id, productId)))[0];
  if (!product) return notFound();
  const [skuList, discountList, imageList] = await Promise.all([
    db().select().from(skus).where(eq(skus.productId, productId)).orderBy(asc(skus.sizeMl), asc(skus.label)),
    db().select().from(productDiscounts).where(eq(productDiscounts.productId, productId)),
    db().select().from(productImages).where(eq(productImages.productId, productId)),
  ]);
  // The edit form below only ever targets this one row — upsertDiscount
  // updates/removes it by productId, matching the "one discount per
  // product" convention every reprice/repricing script already assumes.
  // Any extra rows (shouldn't normally happen) still show in the list above.
  const activeDiscount = discountList[0];
  const isDecant = product.type === "DECANT";
  let pendingPreOrderMl = 0;
  if (isDecant && skuList.length > 0) {
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
  // "View in shop" needs a live SKU page to land on; a hidden product has none.
  const shopSku = product.isActive ? skuList.find((sku) => sku.isActive) : undefined;
  async function saveProduct(formData: FormData) {
    "use server";
    await upsertProduct(formData);
  }
  return (
    <div className="space-y-6">
      <AreaHeader
        eyebrow={`${product.brand} · ${labelForType(product.type)} · ${labelForCategory(product.fragranceCategory)}`}
        title={product.name}
        badge={
          <Badge variant={product.isActive ? "outline" : "secondary"}>
            {product.isActive ? "Visible on storefront" : "Hidden from storefront"}
          </Badge>
        }
        actions={
          <>
            {shopSku ? (
              <Button asChild variant="outline" className={PAGE_ACTION_CLASS}>
                <Link href={`/shop/${shopSku.id}`} target="_blank" rel="noopener noreferrer">
                  View in shop <ExternalLink className="h-4 w-4" aria-hidden="true" />
                  <span className="sr-only">(opens in a new tab)</span>
                </Link>
              </Button>
            ) : null}
            <Button asChild className={PAGE_ACTION_CLASS}>
              <Link href={`/admin/products/${product.id}/skus/new`}>Add SKU</Link>
            </Button>
          </>
        }
      />
      {welcome && !product.isActive ? (
        <p role="status" className="rounded-lg border border-gold/40 bg-gold/10 p-3 text-sm">
          Imported and hidden from the shop for now. Set the cost and pricing below, set the SKU&apos;s size, then tick
          Visible on storefront and Save.
        </p>
      ) : null}

      {/* A main column (product, SKUs) and a side column (pool, discount,
          images) from xl. Below that both wrappers are `contents`, so their
          cards join one stack and `order-*` interleaves them: the product and
          its pool first, then SKUs, then discount and images. */}
      <div className="flex flex-col gap-4 xl:grid xl:grid-cols-[minmax(0,1fr)_22rem] xl:items-start">
        <div className="contents xl:flex xl:min-w-0 xl:flex-col xl:gap-4">
          <Card className="order-1">
            <CardHeader>
              <CardTitle className="text-base">Product</CardTitle>
            </CardHeader>
            <CardContent>
              <form id="save-product-form" action={saveProduct} className="space-y-6">
                <input type="hidden" name="productId" value={product.id} />
                {/* Type is fixed at creation — existing SKUs assume this field set. */}
                <input type="hidden" name="type" value={product.type} />
                {/* Remaining ml has exactly one editable control on this page —
                    the Decant pool card's Adjust form (it also logs a reason).
                    Saving the product must not silently reset it, so it rides
                    along hidden. */}
                {isDecant ? <input type="hidden" name="remainingMl" value={product.remainingMl ?? 0} /> : null}

                <FormSection title="Details">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <Field label="Name" htmlFor="p-name">
                      <Input id="p-name" name="name" defaultValue={product.name} required />
                    </Field>
                    <Field label="Brand" htmlFor="p-brand">
                      <Input id="p-brand" name="brand" defaultValue={product.brand} required />
                    </Field>
                    <Field label="Shelf" htmlFor="p-category">
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
                    <Field label="Gender" htmlFor="p-gender">
                      <select id="p-gender" name="gender" defaultValue={product.gender ?? ""} className={selectClass}>
                        <option value="">Not set</option>
                        <option value="men">Men</option>
                        <option value="women">Women</option>
                        <option value="unisex">Unisex</option>
                      </select>
                    </Field>
                    <Field label="Type (set when created)" htmlFor="p-type-readonly">
                      <p id="p-type-readonly" className="flex h-11 items-center rounded-lg border bg-muted/40 px-3 text-sm text-muted-foreground">
                        {labelForType(product.type)}
                      </p>
                    </Field>
                    <Field label="Description" htmlFor="p-description" className="sm:col-span-2">
                      <Textarea id="p-description" name="description" rows={4} defaultValue={product.description ?? ""} />
                    </Field>
                  </div>
                </FormSection>

                <FormSection title="Pricing">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <Field label="Cost price (₱ paid wholesale)" htmlFor="p-costPrice">
                      <Input
                        id="p-costPrice"
                        name="costPrice"
                        type="number"
                        step="0.01"
                        defaultValue={product.costPrice != null ? fromCentavos(product.costPrice) : ""}
                        placeholder="e.g. 3500 or 3500.50"
                        required
                      />
                    </Field>
                    <Field label="Reference size (ml)" htmlFor="p-sourceMl">
                      <Input id="p-sourceMl" name="sourceMl" type="number" defaultValue={product.sourceMl ?? ""} placeholder="e.g. 100" />
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
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Reference price = cost run through the formula. In-house decants scale from it by ml (reference
                    price ÷ reference size × the SKU&apos;s ml); a SKU without a size uses it as is. Retail decants keep
                    their own price on the SKU. Amounts are in pesos, not centavos.
                  </p>
                </FormSection>

                {/* Main action last, so Save sits on the right edge
                    (.cursor/rules/form-actions.mdc). The delete trigger is
                    type="button" and its confirm submits the separate delete
                    form below via `form=`, never this one. */}
                <div className="flex flex-col gap-4 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
                  <label className="flex min-h-11 items-center gap-2 text-sm">
                    <input type="checkbox" name="isActive" defaultChecked={product.isActive} />
                    Visible on storefront
                  </label>
                  <div className="flex flex-wrap justify-end gap-2">
                    <ConfirmSubmitButton
                      formId="delete-product-form"
                      triggerLabel="Archive or delete"
                      triggerVariant="outline"
                      triggerClassName="h-11 text-destructive hover:text-destructive"
                      title={`Archive or delete "${product.name}"?`}
                      description="If it has orders, cart entries, or wishlist saves, it's archived (hidden, kept for records). Otherwise it's deleted permanently. This can't be undone from here."
                      confirmLabel="Archive or delete"
                    />
                    <SubmitButton className={FORM_ACTION_CLASS}>Save</SubmitButton>
                  </div>
                </div>
              </form>
              <form id="delete-product-form" action={archiveOrDeleteProduct}>
                <input type="hidden" name="productId" value={product.id} />
              </form>
            </CardContent>
          </Card>

          <Card className="order-3">
            <CardHeader>
              <CardTitle className="text-base">SKUs ({skuList.length})</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              {skuList.length === 0 ? (
                <div className="space-y-3 rounded-lg border border-dashed p-6 text-center">
                  <p className="text-muted-foreground">No SKUs yet. Add one to put a size on sale.</p>
                  <Button asChild className="h-11">
                    <Link href={`/admin/products/${product.id}/skus/new`}>Add SKU</Link>
                  </Button>
                </div>
              ) : null}
              {skuList.map((sku) => (
                <section key={sku.id} aria-labelledby={`sku-title-${sku.id}`} className="space-y-4 rounded-lg border p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <h2 id={`sku-title-${sku.id}`} className="font-medium">
                          {sku.label}
                        </h2>
                        <span className="tabular-nums text-muted-foreground">{formatPHP(sku.retailPrice)}</span>
                        {!sku.isActive ? <Badge variant="secondary">Inactive</Badge> : null}
                        {sku.isTester ? <Badge variant="outline">Free tester</Badge> : null}
                      </div>
                      {/* System-generated at creation (generateSkuCode) and never
                          editable — shown, not submitted. */}
                      <p className="truncate font-mono text-xs text-muted-foreground">{sku.sku}</p>
                    </div>
                    <ConfirmSubmitButton
                      formId={`delete-sku-form-${sku.id}`}
                      triggerLabel={<Trash2 className="h-4 w-4" />}
                      triggerVariant="outline"
                      triggerSize="icon"
                      triggerClassName="size-11 shrink-0 text-destructive hover:text-destructive"
                      triggerAriaLabel={`Archive or delete ${sku.label}`}
                      title={`Archive or delete "${sku.label}"?`}
                      description="If it has orders or cart entries, it's archived (hidden, kept for records). Otherwise it's deleted permanently."
                      confirmLabel="Archive or delete"
                    />
                  </div>
                  <form action={upsertSku} className="space-y-4">
                    <input type="hidden" name="skuId" value={sku.id} />
                    <input type="hidden" name="productId" value={product.id} />
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <Field label="Label" htmlFor={`sku-label-${sku.id}`}>
                        <Input id={`sku-label-${sku.id}`} name="label" defaultValue={sku.label} />
                      </Field>
                      <Field label="Size (ml)" htmlFor={`sku-size-${sku.id}`}>
                        <Input id={`sku-size-${sku.id}`} name="sizeMl" type="number" defaultValue={sku.sizeMl ?? ""} />
                      </Field>
                      {isDecant ? (
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
                          {product.type === "FULL_BOTTLE" ? (
                            // No admin-set Fulfillment for a full bottle — it's
                            // derived live from Stock + "Available for pre-order"
                            // below (see resolveBottleAvailability). The stored
                            // column rides along hidden so saving doesn't null it.
                            <input type="hidden" name="fulfillment" value={sku.fulfillment} />
                          ) : (
                            <Field label="Fulfillment" htmlFor={`sku-fulfillment-${sku.id}`}>
                              <select id={`sku-fulfillment-${sku.id}`} name="fulfillment" defaultValue={sku.fulfillment} className={selectClass}>
                                <option value="ON_HAND">On hand</option>
                                <option value="PRE_ORDER">Pre-order</option>
                              </select>
                            </Field>
                          )}
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
                    <div className="flex flex-col gap-3 border-t pt-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex flex-col gap-2">
                        <label className="flex items-center gap-2 text-xs">
                          <input type="checkbox" name="isActive" defaultChecked={sku.isActive} /> Active
                        </label>
                        {isDecant ? (
                          <TesterToggle skuId={sku.id} initialChecked={sku.isTester} />
                        ) : (
                          // The free tester is a decant; a bottle or partial is never one.
                          <input type="hidden" name="isTester" value="" />
                        )}
                        {product.type === "FULL_BOTTLE" ? (
                          <label className="flex items-start gap-2 text-xs">
                            <input type="checkbox" name="availableForPreOrder" defaultChecked={sku.availableForPreOrder} className="mt-0.5" />
                            <span>
                              Available for pre-order{" "}
                              <span className="text-muted-foreground">(keeps selling this size once Stock reaches 0)</span>
                            </span>
                          </label>
                        ) : null}
                      </div>
                      <SubmitButton className={FORM_ACTION_CLASS}>Save</SubmitButton>
                    </div>
                  </form>
                  <form id={`delete-sku-form-${sku.id}`} action={archiveOrDeleteSku}>
                    <input type="hidden" name="skuId" value={sku.id} />
                    <input type="hidden" name="productId" value={product.id} />
                  </form>
                </section>
              ))}
            </CardContent>
          </Card>
        </div>

        <div className="contents xl:flex xl:min-w-0 xl:flex-col xl:gap-4">
          {isDecant ? (
            <Card className="order-2">
              <CardHeader>
                <CardTitle className="text-base">Decant pool</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <dl className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg border p-3">
                    <dt className="text-xs text-muted-foreground">Remaining</dt>
                    <dd className="font-serif-display text-2xl tabular-nums">{product.remainingMl ?? 0}ml</dd>
                  </div>
                  <div className="rounded-lg border p-3">
                    <dt className="text-xs text-muted-foreground">In open pre-orders</dt>
                    <dd className="font-serif-display text-2xl tabular-nums">{pendingPreOrderMl}ml</dd>
                  </div>
                </dl>
                <form action={adjustDecantMl} className="space-y-3">
                  <input type="hidden" name="productId" value={product.id} />
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-1">
                    <Field label="New remaining ml" htmlFor="adjust-ml">
                      <Input id="adjust-ml" name="remainingMl" type="number" defaultValue={product.remainingMl ?? 0} />
                    </Field>
                    <Field label="Reason" htmlFor="adjust-note">
                      <Input id="adjust-note" name="note" placeholder="e.g. damaged bottle, recount" />
                    </Field>
                  </div>
                  <SubmitButton className={FORM_ACTION_CLASS}>Adjust pool</SubmitButton>
                </form>
                <p className="text-xs text-muted-foreground">
                  In-house decant sizes are on hand while the pool is at or above both the pre-order threshold and
                  that size, and pre-order otherwise. Retail decants ignore the pool and use their own stock.
                </p>
              </CardContent>
            </Card>
          ) : null}

          <Card className="order-4">
            <CardHeader>
              <CardTitle className="text-base">Discount</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              {discountList.length === 0 ? (
                <p className="text-muted-foreground">No discount on this product.</p>
              ) : (
                <ul className="space-y-2">
                  {discountList.map((d) => {
                    const displayEndsAt = toDisplayDate(d.endsAt, "end");
                    return (
                      <li key={d.id} className="flex flex-wrap items-center gap-2">
                        <span className="font-medium">
                          {d.type === "PERCENTAGE" ? `${d.amount}% off` : `${formatPHP(d.amount)} off`}
                        </span>
                        <Badge variant={d.isActive ? "outline" : "secondary"}>{d.isActive ? "Active" : "Inactive"}</Badge>
                        {d.startsAt ? (
                          <span className="text-xs text-muted-foreground">
                            From {formatDate(d.startsAt)}
                            {displayEndsAt ? ` to ${formatDate(displayEndsAt)}` : ", no end date"}
                          </span>
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
              )}
              <form action={upsertDiscount} className="space-y-3 border-t pt-4">
                <input type="hidden" name="productId" value={product.id} />
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Type" htmlFor="new-discount-type">
                    <select
                      id="new-discount-type"
                      name="type"
                      defaultValue={activeDiscount?.type ?? "PERCENTAGE"}
                      className={selectClass}
                    >
                      <option value="PERCENTAGE">Percentage</option>
                      <option value="FIXED">Fixed ₱ off</option>
                    </select>
                  </Field>
                  <Field label="Amount (0 removes it)" htmlFor="new-discount-amount">
                    <Input
                      id="new-discount-amount"
                      name="amount"
                      type="number"
                      step="0.01"
                      min="0"
                      required
                      defaultValue={
                        activeDiscount
                          ? activeDiscount.type === "FIXED"
                            ? (activeDiscount.amount / 100).toFixed(2)
                            : activeDiscount.amount
                          : undefined
                      }
                    />
                  </Field>
                  <Field label="Starts" htmlFor="new-discount-starts-at" className="col-span-2 min-w-0 sm:col-span-1 xl:col-span-2">
                    <Input
                      id="new-discount-starts-at"
                      name="startsAt"
                      type="date"
                      defaultValue={
                        activeDiscount?.startsAt ? formatPhDateBoundary(activeDiscount.startsAt, "start") : todayPhDateString()
                      }
                    />
                  </Field>
                  <Field label="Ends (blank = never)" htmlFor="new-discount-ends-at" className="col-span-2 min-w-0 sm:col-span-1 xl:col-span-2">
                    <Input
                      id="new-discount-ends-at"
                      name="endsAt"
                      type="date"
                      defaultValue={activeDiscount?.endsAt ? formatPhDateBoundary(activeDiscount.endsAt, "end") : ""}
                    />
                  </Field>
                </div>
                <SubmitButton className={FORM_ACTION_CLASS}>{activeDiscount ? "Update discount" : "Add discount"}</SubmitButton>
              </form>
            </CardContent>
          </Card>

          <Card className="order-5">
            <CardHeader>
              <CardTitle className="text-base">Images</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {imageList.length === 0 ? (
                <p className="text-sm text-muted-foreground">No images yet. The shop shows a placeholder until you add one.</p>
              ) : (
                <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4 xl:grid-cols-3">
                  {imageList.map((image) => (
                    <li key={image.id} className="min-w-0 space-y-2">
                      <a
                        href={image.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block overflow-hidden rounded-lg border bg-muted/40"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={image.url} alt={image.alt ?? ""} className="aspect-[3/4] w-full object-cover" />
                        <span className="sr-only">Open image in a new tab</span>
                      </a>
                      <form action={removeProductImage}>
                        <input type="hidden" name="imageId" value={image.id} />
                        <input type="hidden" name="productId" value={product.id} />
                        <SubmitButton variant="outline" className="h-11 w-full">
                          Remove
                        </SubmitButton>
                      </form>
                    </li>
                  ))}
                </ul>
              )}
              <form action={addProductImage} className="space-y-3 border-t pt-4">
                <input type="hidden" name="productId" value={product.id} />
                <Field label="Image file" htmlFor="new-image-file">
                  <Input id="new-image-file" name="file" type="file" accept="image/jpeg,image/png,image/webp" />
                </Field>
                <Field label="Or paste an image URL" htmlFor="new-image-url">
                  <Input id="new-image-url" name="url" type="url" placeholder="https://…" />
                </Field>
                <Field label="Alt text" htmlFor="new-image-alt">
                  <Input id="new-image-alt" name="alt" placeholder="e.g. Brand — Perfume name" />
                </Field>
                <SubmitButton className={FORM_ACTION_CLASS}>Add image</SubmitButton>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
