import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export default function AdminQrLoading() {
  return (
    <div className="space-y-4">
      <h1 className="font-serif-display text-2xl">QR codes</h1>
      <Skeleton className="h-40 w-full" />
      <Skeleton className="h-40 w-full" />
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
            <Button type="button" disabled>
              Add QR code
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
