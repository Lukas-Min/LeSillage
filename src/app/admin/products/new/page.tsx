import Link from "next/link";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { upsertProduct } from "@/actions/admin-catalog-actions";
import { db } from "@/db/client";
import { products } from "@/db/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/ui/submit-button";
import { FORM_ACTION_CLASS } from "@/components/ui/form-action";
import { AreaHeader, PAGE_ACTION_CLASS, PageColumns } from "@/components/ui/page-layout";
import { SearchSelect } from "@/components/admin/search-select";

export const dynamic = "force-dynamic";

export default async function NewProductPage({
  searchParams,
}: {
  searchParams: Promise<{ copyFrom?: string }>;
}) {
  const { copyFrom } = await searchParams;
  const [allProducts, copySource] = await Promise.all([
    db()
      .select({ id: products.id, brand: products.brand, name: products.name })
      .from(products)
      .orderBy(products.brand, products.name),
    copyFrom
      ? db()
          .select()
          .from(products)
          .where(eq(products.id, copyFrom))
          .then((rows) => rows[0])
      : Promise.resolve(undefined),
  ]);
  // Category/Concentration/Gender/Description/Notes are fragrance-level
  // facts, identical across a fragrance's Decant/Full bottle/Partial rows —
  // collapse those into one entry per brand+name so the same fragrance isn't
  // listed 2-3 times with no meaningful difference between the choices.
  const existingProducts = Array.from(
    new Map(allProducts.map((p) => [`${p.brand}::${p.name}`, p])).values(),
  );

  async function create(formData: FormData) {
    "use server";
    const id = await upsertProduct(formData);
    redirect(`/admin/products/${id}`);
  }

  return (
    <div className="space-y-6">
      <AreaHeader
        eyebrow="Products"
        title="New product"
        actions={
          <Button asChild variant="outline" className={PAGE_ACTION_CLASS}>
            <Link href="/admin/products">Back</Link>
          </Button>
        }
      />
      {/* The copy-from picker sits at the top of the main column, inside the
          create form's markup, so its select and button point at this
          separate GET form with `form=` (forms can't nest). */}
      {existingProducts.length > 0 ? <form id="copy-from-form" className="hidden" /> : null}
      {/* One form, two columns from xl like the product page: Details in the
          main column, Pricing in the side column, Create at the bottom right. */}
      <form action={create} className="space-y-4">
        <PageColumns
          main={
            <>
              {existingProducts.length > 0 ? (
                <Card>
                  <CardContent className="p-4">
                    {/* Top-aligned, not bottom: the search list opens under the
                        field, and Load details should stay beside the field. */}
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
                      <div className="min-w-0 flex-1 space-y-1">
                        <Label htmlFor="copyFrom">Choose a fragrance</Label>
                        <SearchSelect
                          id="copyFrom"
                          name="copyFrom"
                          form="copy-from-form"
                          defaultValue={copyFrom ?? ""}
                          options={existingProducts.map((p) => ({ value: p.id, label: `${p.brand} — ${p.name}` }))}
                          placeholder="Pick a fragrance…"
                          searchLabel="Search fragrances"
                          searchPlaceholder="Search by brand or name…"
                          noun="fragrances"
                        />
                      </div>
                      <Button type="submit" form="copy-from-form" variant="outline" className="h-11 sm:mt-6">
                        Load details
                      </Button>
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">
                      Fills in Name/Brand/Category/Concentration/Gender/Description/Notes below — useful when adding
                      e.g. the Full Bottle of a fragrance you already have as a Decant. You still set type, size, and
                      price yourself.
                    </p>
                  </CardContent>
                </Card>
              ) : null}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Details</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="space-y-1 sm:col-span-2">
                      <Label htmlFor="name">Name</Label>
                      <Input id="name" name="name" defaultValue={copySource?.name ?? ""} required />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="new-brand">Brand</Label>
                      <Input id="new-brand" name="brand" defaultValue={copySource?.brand ?? ""} required />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="new-type">Type</Label>
                      <select id="new-type" name="type" className="h-11 w-full rounded-lg border bg-background px-3 text-base md:text-sm" defaultValue="DECANT">
                        <option value="DECANT">Decant</option>
                        <option value="FULL_BOTTLE">Full bottle</option>
                        <option value="PARTIAL">Partial</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="new-fragranceCategory">Shelf</Label>
                      <select
                        id="new-fragranceCategory"
                        name="fragranceCategory"
                        className="h-11 w-full rounded-lg border bg-background px-3 text-base md:text-sm"
                        defaultValue={copySource?.fragranceCategory ?? "NICHE"}
                      >
                        <option value="NICHE">Niche</option>
                        <option value="DESIGNER">Designer</option>
                        <option value="MIDDLE_EASTERN">Middle Eastern</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="new-concentration">Concentration</Label>
                      <select
                        id="new-concentration"
                        name="concentration"
                        className="h-11 w-full rounded-lg border bg-background px-3 text-base md:text-sm"
                        defaultValue={copySource?.concentration ?? ""}
                      >
                        <option value="">No concentration set</option>
                        <option value="EAU_DE_COLOGNE">Eau de Cologne</option>
                        <option value="EAU_DE_TOILETTE">Eau de Toilette</option>
                        <option value="EAU_DE_PARFUM">Eau de Parfum</option>
                        <option value="PARFUM">Parfum</option>
                        <option value="EXTRAIT_DE_PARFUM">Extrait de Parfum</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="new-gender">Gender</Label>
                      <select id="new-gender" name="gender" className="h-11 w-full rounded-lg border bg-background px-3 text-base md:text-sm" defaultValue={copySource?.gender ?? ""}>
                        <option value="">Gender not set</option>
                        <option value="men">Men</option>
                        <option value="women">Women</option>
                        <option value="unisex">Unisex</option>
                      </select>
                    </div>
                    <div className="space-y-1 sm:col-span-2">
                      <Label htmlFor="new-description">Description</Label>
                      <Textarea id="new-description" name="description" defaultValue={copySource?.description ?? ""} />
                    </div>
                    <div className="space-y-1 sm:col-span-2">
                      <Label htmlFor="new-notes">Notes</Label>
                      <Textarea id="new-notes" name="notes" defaultValue={copySource?.notes ?? ""} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          }
          side={
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Pricing</CardTitle>
              </CardHeader>
              <CardContent>
                {/* Two fields a row while the card is full width, one a row
                    in the 22rem side column from xl. */}
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-1">
                  <div className="space-y-1 sm:col-span-2 xl:col-span-1">
                    <Label htmlFor="new-costPrice">Cost price (₱, what you paid wholesale)</Label>
                    <Input
                      id="new-costPrice"
                      name="costPrice"
                      type="number"
                      step="0.01"
                      placeholder="e.g. 3500 — add a period for centavos, e.g. 3500.50"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="new-pricingMode">Pricing formula</Label>
                    <select
                      id="new-pricingMode"
                      name="pricingMode"
                      defaultValue="PERCENTAGE"
                      className="h-11 w-full rounded-lg border bg-background px-3 text-base md:text-sm"
                    >
                      <option value="PERCENTAGE">Percentage markup</option>
                      <option value="FIXED">Fixed ₱ increment</option>
                      <option value="DIRECT">Direct retail price</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="new-pricingInput">Markup % (or ₱ for fixed/direct)</Label>
                    <Input id="new-pricingInput" name="pricingInput" type="number" step="0.01" defaultValue={30} />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="new-sourceMl">Reference size (ml)</Label>
                    <Input id="new-sourceMl" name="sourceMl" type="number" placeholder="e.g. 100 for a 100ml bottle" />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="new-remainingMl">Remaining ml (decants)</Label>
                    <Input id="new-remainingMl" name="remainingMl" type="number" />
                  </div>
                  <p className="text-xs text-muted-foreground sm:col-span-2 xl:col-span-1">
                    For In-house decants, every size&apos;s retail price is derived from this: reference price ÷ source ml
                    × that size&apos;s ml. A Retail decant is priced on the SKU instead, and is not overwritten when you
                    save the product. Cost price and the Fixed/Direct markup are entered in pesos (add a period for
                    centavos) — not centavos.
                  </p>
                </div>
              </CardContent>
            </Card>
          }
        />
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <label className="flex min-h-11 items-center gap-2 text-sm">
            <input type="checkbox" name="isActive" defaultChecked />
            Visible on storefront
          </label>
          <SubmitButton className={FORM_ACTION_CLASS}>Create</SubmitButton>
        </div>
      </form>
    </div>
  );
}
