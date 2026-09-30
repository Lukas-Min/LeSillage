import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { FORM_ACTION_CLASS } from "@/components/ui/form-action";
import { AreaHeader, PAGE_ACTION_CLASS, PageColumns } from "@/components/ui/page-layout";

export default function AdminNewProductLoading() {
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
      <div className="space-y-4">
        <PageColumns
          main={
            <>
              <Card>
                <CardContent className="p-4">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
                    <div className="min-w-0 flex-1 space-y-1">
                      <Label>Choose a fragrance</Label>
                      <Skeleton className="h-11 w-full" />
                    </div>
                    <Button type="button" variant="outline" disabled className="h-11 sm:mt-6">
                      Load details
                    </Button>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Fills in Name/Brand/Shelf/Concentration/Gender/Description/Notes below — useful when adding
                    e.g. the Full Bottle of a fragrance you already have as a Decant. You still set type, size, and
                    price yourself.
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Details</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="space-y-1 sm:col-span-2">
                      <Label htmlFor="name">Name</Label>
                      <Input id="name" disabled />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="new-brand">Brand</Label>
                      <Input id="new-brand" disabled />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="new-type">Type</Label>
                      <select id="new-type" disabled className="h-11 w-full rounded-lg border bg-background px-3 text-base md:text-sm">
                        <option>Choose a type</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="new-fragranceCategory">Shelf</Label>
                      <select id="new-fragranceCategory" disabled className="h-11 w-full rounded-lg border bg-background px-3 text-base md:text-sm">
                        <option>Niche</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="new-concentration">Concentration</Label>
                      <select id="new-concentration" disabled className="h-11 w-full rounded-lg border bg-background px-3 text-base md:text-sm">
                        <option>No concentration set</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="new-gender">Gender</Label>
                      <select id="new-gender" disabled className="h-11 w-full rounded-lg border bg-background px-3 text-base md:text-sm">
                        <option>Gender not set</option>
                      </select>
                    </div>
                    <div className="space-y-1 sm:col-span-2">
                      <Label htmlFor="new-description">Description</Label>
                      <Textarea id="new-description" disabled />
                    </div>
                    <div className="space-y-1 sm:col-span-2">
                      <Label htmlFor="new-notes">Notes</Label>
                      <Textarea id="new-notes" disabled />
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
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-1">
                  <div className="space-y-1 sm:col-span-2 xl:col-span-1">
                    <Label htmlFor="new-costPrice">Cost price (₱, what you paid wholesale)</Label>
                    <Input id="new-costPrice" type="number" placeholder="e.g. 3500 — add a period for centavos, e.g. 3500.50" disabled />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="new-pricingMode">Pricing formula</Label>
                    <select id="new-pricingMode" disabled className="h-11 w-full rounded-lg border bg-background px-3 text-base md:text-sm">
                      <option>Percentage markup</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="new-pricingInput">Markup % (or ₱ for fixed/direct)</Label>
                    <Input id="new-pricingInput" type="number" defaultValue={30} disabled />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="new-sourceMl">Reference size (ml)</Label>
                    <Input id="new-sourceMl" type="number" placeholder="e.g. 100 for a 100ml bottle" disabled />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="new-remainingMl">Remaining ml (decants)</Label>
                    <Input id="new-remainingMl" type="number" disabled />
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
            <input type="checkbox" defaultChecked disabled />
            Visible on storefront
          </label>
          <Button type="button" disabled className={FORM_ACTION_CLASS}>
            Create
          </Button>
        </div>
      </div>
    </div>
  );
}
