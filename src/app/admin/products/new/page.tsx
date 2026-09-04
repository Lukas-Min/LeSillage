import { redirect } from "next/navigation";
import { upsertProduct } from "@/actions/admin-catalog-actions";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SubmitButton } from "@/components/ui/submit-button";

export default function NewProductPage() {
  async function create(formData: FormData) {
    "use server";
    const id = await upsertProduct(formData);
    redirect(`/admin/products/${id}`);
  }
  return (
    <div className="space-y-4">
      <h1 className="font-serif-display text-2xl">New product</h1>
      <Card>
        <CardContent className="p-4">
          <form action={create} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1 sm:col-span-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" name="name" required />
            </div>
            <Input name="brand" placeholder="Brand" required />
            <Input name="family" placeholder="Family" />
            <select name="type" className="h-11 rounded-lg border bg-background px-3 text-sm" defaultValue="DECANT">
              <option value="DECANT">Decant</option>
              <option value="FULL_BOTTLE">Full bottle</option>
              <option value="PARTIAL">Partial</option>
            </select>
            <select name="fragranceCategory" className="h-11 rounded-lg border bg-background px-3 text-sm" defaultValue="NICHE">
              <option value="NICHE">Niche</option>
              <option value="DESIGNER">Designer</option>
              <option value="MIDDLE_EASTERN">Middle Eastern</option>
            </select>
            <select name="concentration" className="h-11 rounded-lg border bg-background px-3 text-sm" defaultValue="">
              <option value="">No concentration set</option>
              <option value="EAU_DE_COLOGNE">Eau de Cologne</option>
              <option value="EAU_DE_TOILETTE">Eau de Toilette</option>
              <option value="EAU_DE_PARFUM">Eau de Parfum</option>
              <option value="PARFUM">Parfum</option>
              <option value="EXTRAIT_DE_PARFUM">Extrait de Parfum</option>
            </select>
            <Input name="sourceMl" type="number" placeholder="Reference size, ml (e.g. 100 for a 100ml bottle)" />
            <Input name="remainingMl" type="number" placeholder="Remaining ml (decants)" />
            <Textarea name="description" placeholder="Description" className="sm:col-span-2" />
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
