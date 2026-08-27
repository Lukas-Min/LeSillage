import { db } from "@/db/client";
import { qrCodes } from "@/db/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/ui/submit-button";
import { createQrCode, deleteQrCode, updateQrCode } from "@/actions/admin-qr-actions";

export const dynamic = "force-dynamic";

export default async function QrAdminPage() {
  const rows = await db().select().from(qrCodes).orderBy(qrCodes.position);
  return (
    <div className="space-y-4">
      <h1 className="font-serif-display text-2xl">QR codes</h1>
      {rows.map((qr) => (
        <Card key={qr.id}>
          <CardContent className="p-4">
            <form action={updateQrCode} className="flex flex-col gap-3 sm:flex-row sm:items-start">
              <input type="hidden" name="id" value={qr.id} />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qr.imageUrl} alt={`${qr.bankName} QR`} className="h-24 w-24 rounded border object-contain" />
              <div className="grid flex-1 grid-cols-1 gap-2 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label htmlFor={`bankName-${qr.id}`}>Bank / method</Label>
                  <Input id={`bankName-${qr.id}`} name="bankName" defaultValue={qr.bankName} required />
                </div>
                <div className="space-y-1">
                  <Label htmlFor={`accountName-${qr.id}`}>Account name</Label>
                  <Input id={`accountName-${qr.id}`} name="accountName" defaultValue={qr.accountName} required />
                </div>
                <div className="space-y-1">
                  <Label htmlFor={`accountNumber-${qr.id}`}>Account number</Label>
                  <Input id={`accountNumber-${qr.id}`} name="accountNumber" defaultValue={qr.accountNumber} required />
                </div>
                <div className="space-y-1">
                  <Label htmlFor={`position-${qr.id}`}>Position</Label>
                  <Input id={`position-${qr.id}`} name="position" type="number" defaultValue={qr.position} />
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <Label htmlFor={`file-${qr.id}`}>Replace QR image</Label>
                  <Input id={`file-${qr.id}`} name="file" type="file" accept="image/jpeg,image/png,image/webp" />
                </div>
                <label className="flex items-center gap-2 text-sm sm:col-span-2">
                  <input type="checkbox" name="isActive" defaultChecked={qr.isActive} />
                  Active
                </label>
                <div className="flex gap-2 sm:col-span-2">
                  <SubmitButton>Save</SubmitButton>
                </div>
              </div>
            </form>
            <form action={deleteQrCode} className="mt-3">
              <input type="hidden" name="id" value={qr.id} />
              <SubmitButton variant="outline">Delete</SubmitButton>
            </form>
          </CardContent>
        </Card>
      ))}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Add a QR code</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createQrCode} className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <Input name="bankName" placeholder="Bank / method (e.g. GCash)" required />
            <Input name="accountName" placeholder="Account name" required />
            <Input name="accountNumber" placeholder="Account number" required />
            <Input name="position" type="number" placeholder="Position" defaultValue={rows.length} />
            <div className="space-y-1 sm:col-span-2">
              <Label htmlFor="new-qr-file">QR image</Label>
              <Input id="new-qr-file" name="file" type="file" accept="image/jpeg,image/png,image/webp" required />
            </div>
            <label className="flex items-center gap-2 text-sm sm:col-span-2">
              <input type="checkbox" name="isActive" defaultChecked />
              Active
            </label>
            <div className="sm:col-span-2">
              <SubmitButton>Add QR code</SubmitButton>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
