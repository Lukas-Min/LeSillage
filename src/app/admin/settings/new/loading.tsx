import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";

export default function NewOptionValueLoading() {
  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="font-serif-display text-2xl">Add a value</h1>
          <Skeleton className="mt-1 h-5 w-32" />
        </div>
        <Button variant="outline" className="h-11" disabled>
          Back
        </Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">New value</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label>Value</Label>
              <Input disabled placeholder="e.g. SPICY" />
            </div>
            <div className="space-y-1">
              <Label>Label</Label>
              <Input disabled placeholder="e.g. Spicy" />
            </div>
            <p className="text-xs text-muted-foreground sm:col-span-2">
              The value is what products store, written in capitals like the others (SPICY). The label is what customers
              and admins see. A value can&apos;t be renamed once products use it.
            </p>
            <div className="sm:col-span-2">
              <Button type="button" disabled className="h-11 w-full sm:ml-auto sm:block sm:w-fit">
                Save
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
