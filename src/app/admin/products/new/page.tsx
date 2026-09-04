import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { upsertProduct } from "@/actions/admin-catalog-actions";
import { db } from "@/db/client";
import { products } from "@/db/schema";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/ui/submit-button";

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
  // Family/Category/Concentration/Gender/Description/Notes are fragrance-level
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
    <div className="space-y-4">
      <h1 className="font-serif-display text-2xl">New product</h1>
      {existingProducts.length > 0 ? (
        <Card>
          <CardContent className="p-4">
            <form className="flex flex-wrap items-end gap-2">
              <div className="min-w-0 flex-1 space-y-1">
                <Label htmlFor="copyFrom">Choose a fragrance</Label>
                <select
                  id="copyFrom"
                  name="copyFrom"
                  defaultValue={copyFrom ?? ""}
                  className="h-11 w-full rounded-lg border bg-background px-3 text-sm"
                >
                  {existingProducts.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.brand} — {p.name}
                    </option>
                  ))}
                </select>
              </div>
              <Button type="submit" variant="outline">
                Load details
              </Button>
            </form>
            <p className="mt-2 text-xs text-muted-foreground">
              Fills in Name/Brand/Family/Category/Concentration/Gender/Description/Notes below — useful when adding
              e.g. the Full Bottle of a fragrance you already have as a Decant. You still set type, size, and price
              yourself.
            </p>
          </CardContent>
        </Card>
      ) : null}
      <Card>
        <CardContent className="p-4">
          <form action={create} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1 sm:col-span-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" name="name" defaultValue={copySource?.name ?? ""} required />
            </div>
            <Input name="brand" placeholder="Brand" defaultValue={copySource?.brand ?? ""} required />
            {/* Not user-editable — carried over only via "Copy details from". */}
            <input type="hidden" name="family" value={copySource?.family ?? ""} />
            <select name="type" className="h-11 rounded-lg border bg-background px-3 text-sm" defaultValue="DECANT">
              <option value="DECANT">Decant</option>
              <option value="FULL_BOTTLE">Full bottle</option>
              <option value="PARTIAL">Partial</option>
            </select>
            <select
              name="fragranceCategory"
              className="h-11 rounded-lg border bg-background px-3 text-sm"
              defaultValue={copySource?.fragranceCategory ?? "NICHE"}
            >
              <option value="NICHE">Niche</option>
              <option value="DESIGNER">Designer</option>
              <option value="MIDDLE_EASTERN">Middle Eastern</option>
            </select>
            <select
              name="concentration"
              className="h-11 rounded-lg border bg-background px-3 text-sm"
              defaultValue={copySource?.concentration ?? ""}
            >
              <option value="">No concentration set</option>
              <option value="EAU_DE_COLOGNE">Eau de Cologne</option>
              <option value="EAU_DE_TOILETTE">Eau de Toilette</option>
              <option value="EAU_DE_PARFUM">Eau de Parfum</option>
              <option value="PARFUM">Parfum</option>
              <option value="EXTRAIT_DE_PARFUM">Extrait de Parfum</option>
            </select>
            <select
              name="gender"
              className="h-11 rounded-lg border bg-background px-3 text-sm"
              defaultValue={copySource?.gender ?? ""}
            >
              <option value="">Gender not set</option>
              <option value="men">Men</option>
              <option value="women">Women</option>
              <option value="unisex">Unisex</option>
            </select>
            <Input name="sourceMl" type="number" placeholder="Reference size, ml (e.g. 100 for a 100ml bottle)" />
            <Input name="remainingMl" type="number" placeholder="Remaining ml (decants)" />
            <Textarea
              name="description"
              placeholder="Description"
              defaultValue={copySource?.description ?? ""}
              className="sm:col-span-2"
            />
            <Textarea name="notes" placeholder="Notes" defaultValue={copySource?.notes ?? ""} className="sm:col-span-2" />
            <div className="space-y-1 sm:col-span-2">
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
                className="h-11 w-full rounded-lg border bg-background px-3 text-sm"
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
            <p className="text-xs text-muted-foreground sm:col-span-2">
              For decants, every size&apos;s retail price is derived from this: reference price ÷ source ml × that size&apos;s ml.
              Cost price and the Fixed/Direct markup are entered in pesos (add a period for centavos) — not centavos.
            </p>
            <label className="flex items-center gap-2 text-sm sm:col-span-2">
              <input type="checkbox" name="isActive" defaultChecked />
              Visible on storefront
            </label>
            <SubmitButton>Create</SubmitButton>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
