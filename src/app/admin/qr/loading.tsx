import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { FORM_ACTION_CLASS } from "@/components/ui/form-action";

export default function AdminQrLoading() {
  return (
    <div className="space-y-4">
      <h1 className="font-serif-display text-2xl">QR codes</h1>
      {Array.from({ length: 2 }).map((_, index) => (
        <Card key={index}>
          <CardContent className="p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
              <Skeleton className="h-24 w-24 rounded" />
              <div className="grid flex-1 grid-cols-1 gap-2 sm:grid-cols-2">
                {["Bank / method", "Account name", "Account number", "Position"].map((label) => (
                  <div key={label} className="space-y-1">
                    <Label>{label}</Label>
                    <Skeleton className="h-11 w-full" />
                  </div>
                ))}
                <div className="space-y-1 sm:col-span-2">
                  <Label>Replace QR image</Label>
                  <Skeleton className="h-11 w-full" />
                </div>
                <div className="flex items-center gap-2 text-sm sm:col-span-2">
                  <Skeleton className="size-4" />
                  Active
                </div>
                <div className="flex flex-wrap justify-end gap-2 sm:col-span-2">
                  <Skeleton className="h-11 w-24" />
                  <Skeleton className="h-11 w-full sm:w-20" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Add a QR code</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <Input placeholder="Bank / method (e.g. GCash)" disabled />
          <Input placeholder="Account name" disabled />
          <Input placeholder="Account number" disabled />
          <Input type="number" placeholder="Position" disabled />
          <div className="space-y-1 sm:col-span-2">
            <Label htmlFor="new-qr-file">QR image</Label>
            <Input id="new-qr-file" type="file" disabled />
          </div>
          <label className="flex items-center gap-2 text-sm sm:col-span-2">
            <input type="checkbox" defaultChecked disabled />
            Active
          </label>
          <div className="sm:col-span-2">
            <Button type="button" disabled className={FORM_ACTION_CLASS}>
              Add QR code
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
