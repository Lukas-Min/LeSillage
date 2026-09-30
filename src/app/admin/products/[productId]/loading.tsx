import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { FORM_ACTION_CLASS } from "@/components/ui/form-action";

function Field({ label, className }: { label: string; className?: string }) {
  return (
    <div className={`space-y-1 ${className ?? ""}`}>
      <Label>{label}</Label>
      <Skeleton className="h-11 w-full" />
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <p className="mb-3 text-[11px] uppercase tracking-[0.28em] text-muted-foreground">{children}</p>;
}

/**
 * Same layout as the page: header, then a main column (Product, SKUs) and a
 * side column (Decant pool, Discount, Images) from xl, one stack below it.
 * The product's type isn't known here and decides which fields exist, so
 * it's shaped like a decant, the bulk of the catalog.
 */
export default function AdminProductLoading() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-3 w-48" />
          <Skeleton className="h-8 w-64 max-w-full" />
        </div>
        <div className="flex flex-wrap gap-2 lg:max-w-[55%] lg:shrink-0 lg:justify-end">
          <Button type="button" variant="outline" disabled className="h-11 flex-1 sm:flex-none">
            View in shop
          </Button>
          <Button type="button" disabled className="h-11 flex-1 sm:flex-none">
            Add SKU
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-4 xl:grid xl:grid-cols-[minmax(0,1fr)_22rem] xl:items-start">
        <div className="contents xl:flex xl:min-w-0 xl:flex-col xl:gap-4">
          <Card className="order-1">
            <CardHeader>
              <CardTitle className="text-base">Product</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <SectionTitle>Details</SectionTitle>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {["Name", "Brand", "Shelf", "Concentration", "Gender", "Type (set when created)"].map((label) => (
                    <Field key={label} label={label} />
                  ))}
                  <div className="space-y-1 sm:col-span-2">
                    <Label>Description</Label>
                    <Skeleton className="h-24 w-full" />
                  </div>
                  <div className="space-y-1 sm:col-span-2">
                    <Label>Notes</Label>
                    <Skeleton className="h-16 w-full" />
                  </div>
                </div>
              </div>
              <div>
                <SectionTitle>Pricing</SectionTitle>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {["Cost price (₱ paid wholesale)", "Reference size (ml)", "Pricing formula", "Markup % (or ₱ for fixed/direct)"].map(
                    (label) => (
                      <Field key={label} label={label} />
                    ),
                  )}
                </div>
                <div className="mt-3 space-y-1">
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-2/3" />
                </div>
              </div>
              <div className="flex flex-col gap-4 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-h-11 items-center gap-2 text-sm">
                  <Skeleton className="size-3.5 rounded-sm" />
                  Visible on storefront
                </div>
                <div className="flex flex-wrap justify-end gap-2">
                  <Button type="button" variant="outline" disabled className="h-11 text-destructive">
                    Archive or delete
                  </Button>
                  <Button type="button" disabled className={FORM_ACTION_CLASS}>
                    Save
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="order-3">
            <CardHeader>
              <CardTitle className="text-base">SKUs</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              {Array.from({ length: 2 }).map((_, index) => (
                <div key={index} className="space-y-4 rounded-lg border p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-40" />
                      <Skeleton className="h-3 w-52 max-w-full" />
                    </div>
                    <Skeleton className="size-11 shrink-0" />
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <Field label="Label" />
                    <Field label="Size (ml)" />
                    <Field label="Provenance" />
                    <div className="flex h-11 items-center sm:self-end">
                      <Skeleton className="h-4 w-full" />
                    </div>
                  </div>
                  <div className="flex flex-col gap-3 border-t pt-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center gap-2 text-xs">
                        <Skeleton className="size-3.5 rounded-sm" /> Active
                      </div>
                      <Skeleton className="h-4 w-72 max-w-full" />
                    </div>
                    <Button type="button" disabled className={FORM_ACTION_CLASS}>
                      Save
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <div className="contents xl:flex xl:min-w-0 xl:flex-col xl:gap-4">
          <Card className="order-2">
            <CardHeader>
              <CardTitle className="text-base">Decant pool</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                {["Remaining", "In open pre-orders"].map((label) => (
                  <div key={label} className="space-y-1 rounded-lg border p-3">
                    <p className="text-xs text-muted-foreground">{label}</p>
                    <Skeleton className="h-8 w-16" />
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-1">
                <Field label="New remaining ml" />
                <Field label="Reason" />
              </div>
              <Button type="button" disabled className={FORM_ACTION_CLASS}>
                Adjust pool
              </Button>
            </CardContent>
          </Card>

          <Card className="order-4">
            <CardHeader>
              <CardTitle className="text-base">Discount</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <Skeleton className="h-4 w-44" />
              <div className="space-y-3 border-t pt-4">
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Type" />
                  <Field label="Amount (0 removes it)" />
                  <Field label="Starts" className="col-span-2 sm:col-span-1 xl:col-span-2" />
                  <Field label="Ends (blank = never)" className="col-span-2 sm:col-span-1 xl:col-span-2" />
                </div>
                <Skeleton className="h-11 w-full sm:ml-auto sm:w-36" />
              </div>
            </CardContent>
          </Card>

          <Card className="order-5">
            <CardHeader>
              <CardTitle className="text-base">Images</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 xl:grid-cols-3">
                <div className="space-y-2">
                  <Skeleton className="aspect-[3/4] w-full" />
                  <Skeleton className="h-11 w-full" />
                </div>
              </div>
              <div className="space-y-3 border-t pt-4">
                <div className="space-y-1">
                  <Label>Image file</Label>
                  <Input type="file" disabled />
                </div>
                <div className="space-y-1">
                  <Label>Or paste an image URL</Label>
                  <Input type="url" placeholder="https://…" disabled />
                </div>
                <div className="space-y-1">
                  <Label>Alt text</Label>
                  <Input placeholder="e.g. Brand — Perfume name" disabled />
                </div>
                <Button type="button" disabled className={FORM_ACTION_CLASS}>
                  Add image
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
