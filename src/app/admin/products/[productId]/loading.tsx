import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { FORM_ACTION_CLASS } from "@/components/ui/form-action";

function Field({ label, className }: { label?: string; className?: string }) {
  return (
    <div className={`space-y-1 ${className ?? ""}`}>
      {label ? <Label>{label}</Label> : <Skeleton className="h-3.5 w-24" />}
      <Skeleton className="h-11 w-full" />
    </div>
  );
}

/**
 * The product's type isn't known here and decides which fields exist; this is
 * shaped like a decant (the bulk of the catalog), with the decant-only parts
 * left as unlabeled skeletons since they're absent on a bottle or partial.
 */
export default function AdminProductLoading() {
  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Skeleton className="h-8 w-56" />
        <Button type="button" disabled className="h-11 w-full sm:w-auto">
          Add SKU
        </Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Product</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {["Name", "Brand", "Gender", "Type", "Shelf category", "Concentration", "Reference size (ml)"].map(
              (label) => (
                <Field key={label} label={label} />
              ),
            )}
            <Field />
            <Field label="Cost price (₱, what you paid wholesale)" className="sm:col-span-2" />
            <Field label="Pricing formula" />
            <Field label="Markup % (or ₱ for fixed/direct)" />
            <p className="text-xs text-muted-foreground sm:col-span-2">
              Reference retail price = cost price run through the formula above. In-house decant SKUs scale from
              it (reference price ÷ reference size × that SKU&apos;s ml). A Retail decant has its own Cost/Retail
              formula on the SKU and is not overwritten when you save the product. A SKU without a size uses the
              reference price directly. Cost price and the Fixed/Direct markup are entered in pesos (add a period
              for centavos, e.g. 3500.50) — not centavos.
            </p>
            <div className="space-y-1 sm:col-span-2">
              <Label>Description</Label>
              <Skeleton className="h-16 w-full" />
            </div>
            <div className="flex items-center gap-2 text-sm sm:col-span-2">
              <Skeleton className="size-3.5 rounded-sm" />
              Visible on storefront
            </div>
          </div>
          <div className="mt-4 flex flex-wrap items-end gap-2 border-t pt-4">
            <Field className="flex-1" />
            <Field className="flex-1" />
            <Skeleton className="h-11 w-28" />
          </div>
          <div className="mt-3 space-y-1">
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-2/3" />
          </div>
          <div className="mt-4 flex flex-wrap justify-end gap-2">
            <Button type="button" disabled className="h-11 w-full sm:w-auto">
              Save
            </Button>
            <Button type="button" variant="destructive" disabled className="h-11 w-full sm:w-auto">
              Archive or delete
            </Button>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">SKUs</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6 text-sm">
          {Array.from({ length: 2 }).map((_, index) => (
            <div key={index} className="space-y-3 border-b pb-4">
              <div className="flex items-center justify-between gap-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="size-7" />
              </div>
              <div className="space-y-3">
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                  <Field label="SKU code" />
                  <Field label="Label" />
                  <Field label="Size (ml)" />
                  <Field />
                  <div className="flex h-11 items-center sm:col-span-2">
                    <Skeleton className="h-4 w-full" />
                  </div>
                </div>
                <Skeleton className="h-4 w-44" />
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex flex-wrap items-center gap-4">
                    <Skeleton className="h-4 w-72 max-w-full" />
                    <div className="flex items-center gap-2 text-xs">
                      <Skeleton className="size-3.5 rounded-sm" /> Active
                    </div>
                  </div>
                  <Button type="button" disabled className={FORM_ACTION_CLASS}>
                    Save
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Images</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-11 w-22" />
          </div>
          <div className="space-y-2 border-t pt-3">
            <div className="space-y-1">
              <Label>Image file</Label>
              <Input type="file" disabled />
            </div>
            <div className="space-y-1">
              <Label>Or paste an image URL instead</Label>
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
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Discounts</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <Field label="Type" />
              <Field label="Amount (% or ₱) — 0 to remove" />
              <Field label="Start date" className="col-span-2 sm:col-span-1" />
              <Field label="End date (empty = no expiration)" className="col-span-2 sm:col-span-1" />
            </div>
            <Skeleton className="h-11 w-full sm:ml-auto sm:w-32" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
