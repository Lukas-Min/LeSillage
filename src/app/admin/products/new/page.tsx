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
            <Input name="sourceMl" type="number" placeholder="Source ml (decants)" />
            <Input name="remainingMl" type="number" placeholder="Remaining ml (decants)" />
            <Textarea name="description" placeholder="Description" className="sm:col-span-2" />
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
