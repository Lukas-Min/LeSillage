import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AreaHeader, PAGE_ACTION_CLASS } from "@/components/ui/page-layout";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";

export default function NewOptionValueLoading() {
  return (
    <div className="space-y-6">
      <AreaHeader
        eyebrow="Settings"
        title="Add a value"
        subtitle={<Skeleton className="h-4 w-32" />}
        actions={
          <Button type="button" variant="outline" disabled className={PAGE_ACTION_CLASS}>
            Back
          </Button>
        }
      />
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
