import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AreaHeader, PAGE_ACTION_CLASS } from "@/components/ui/page-layout";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * The fields after Size depend on the product's type, which isn't known here;
 * they're shaped like the decant set (the bulk of the catalog), which also
 * fills the same three rows at `sm` that a bottle or partial does. The product
 * id isn't readable here either, so Back is a disabled placeholder.
 */
export default function NewSkuLoading() {
  return (
    <div className="space-y-6">
      <AreaHeader
        eyebrow="Products"
        title="Add SKU"
        subtitle={<Skeleton className="h-4 w-48 max-w-full" />}
        actions={
          <Button type="button" variant="outline" disabled className={PAGE_ACTION_CLASS}>
            Back
          </Button>
        }
      />
      <Card>
        <CardHeader>
          <CardTitle className="text-base">New SKU</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              <div className="space-y-1">
                <Label>SKU code</Label>
                <p className="flex h-11 items-center rounded-lg border bg-muted/40 px-3 text-sm text-muted-foreground">
                  Generated on save
                </p>
              </div>
              <div className="space-y-1">
                <Label>Label</Label>
                <Input placeholder="e.g. 100ml Eau de Parfum" disabled />
              </div>
              <div className="space-y-1">
                <Label>Size (ml)</Label>
                <Input type="number" placeholder="e.g. 10 — price derives from the product formula" disabled />
              </div>
              {Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className="space-y-1">
                  <Skeleton className="h-3.5 w-24" />
                  <Skeleton className="h-11 w-full" />
                </div>
              ))}
            </div>
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-4">
                <Skeleton className="h-4 w-72 max-w-full" />
                <label className="flex items-center gap-2 text-xs">
                  <input type="checkbox" defaultChecked disabled /> Active
                </label>
              </div>
            </div>
            <div className="flex flex-wrap justify-end gap-2">
              <Button type="button" variant="outline" disabled className="h-11 w-full sm:w-auto">
                Cancel
              </Button>
              <Button type="button" disabled className="h-11 w-full sm:w-auto">
                Save
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
