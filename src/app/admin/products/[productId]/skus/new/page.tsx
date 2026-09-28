import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { upsertSku } from "@/actions/admin-catalog-actions";
import { DecantSkuFields } from "@/components/admin/decant-sku-fields";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/ui/submit-button";
import { db } from "@/db/client";
import { products } from "@/db/schema";

export const dynamic = "force-dynamic";

const selectClass = "h-11 w-full rounded-lg border bg-background px-3 text-sm";

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
    </div>
  );
}

export default async function NewSkuPage({
  params,
}: {
  params: Promise<{ productId: string }>;
}) {
  const { productId } = await params;
  const product = (await db().select().from(products).where(eq(products.id, productId)))[0];
  if (!product) notFound();

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h1 className="font-serif-display text-2xl">Add SKU</h1>
        <p className="text-sm text-muted-foreground">
          {product.brand} — {product.name}
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">New SKU</CardTitle>
        </CardHeader>
        <CardContent>
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
                <Input
                  id="new-sku-size"
                  name="sizeMl"
                  type="number"
                  placeholder="e.g. 10 — price derives from the product formula"
                />
              </Field>
              {product.type === "DECANT" ? (
                <>
                  <input type="hidden" name="condition" value="SEALED" />
                  <input type="hidden" name="packaging" value="BOTTLE_ONLY" />
                  <DecantSkuFields
                    idPrefix="new-sku"
                    initialProvenance="RETAIL"
                    fulfillment="ON_HAND"
                    stock={0}
                    costPrice={0}
                    pricingMode="PERCENTAGE"
                    pricingInput={30}
                  />
                </>
              ) : (
                <>
                  {product.type === "FULL_BOTTLE" ? (
                    <input type="hidden" name="fulfillment" value="ON_HAND" />
                  ) : (
                    <Field label="Fulfillment" htmlFor="new-sku-fulfillment">
                      <select id="new-sku-fulfillment" name="fulfillment" defaultValue="ON_HAND" className={selectClass}>
                        <option value="ON_HAND">On hand</option>
                        <option value="PRE_ORDER">Pre-order</option>
                      </select>
                    </Field>
                  )}
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
            {product.type === "FULL_BOTTLE" ? (
              <label className="flex items-center gap-2 text-xs">
                <input type="checkbox" name="availableForPreOrder" /> Available for pre-order{" "}
                <span className="font-normal text-muted-foreground">
                  (once Stock reaches 0, keep selling this size as a pre-order instead of hiding it from the shop)
                </span>
              </label>
            ) : null}
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-4">
                {product.type === "DECANT" ? (
                  <label className="flex items-center gap-2 text-xs">
                    <input type="checkbox" name="isTester" /> Free tester{" "}
                    <span className="font-normal text-muted-foreground">
                      (still sold in the shop; also handed out free with ₱2,000 of decants)
                    </span>
                  </label>
                ) : (
                  <input type="hidden" name="isTester" value="" />
                )}
                <label className="flex items-center gap-2 text-xs">
                  <input type="checkbox" name="isActive" defaultChecked /> Active
                </label>
              </div>
            </div>
            <div className="flex flex-wrap justify-end gap-2">
              <Button asChild variant="outline" className="h-11 w-full sm:w-auto">
                <Link href={`/admin/products/${product.id}`}>Cancel</Link>
              </Button>
              <SubmitButton className="h-11 w-full sm:w-auto">Save</SubmitButton>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
