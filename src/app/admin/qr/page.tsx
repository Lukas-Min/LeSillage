import { db } from "@/db/client";
import { qrCodes } from "@/db/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AreaHeader, MiniStat, MiniStats, PageColumns } from "@/components/ui/page-layout";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/ui/submit-button";
import { ConfirmSubmitButton } from "@/components/ui/confirm-submit-button";
import { createQrCode, deleteQrCode, updateQrCode } from "@/actions/admin-qr-actions";
import { FORM_ACTION_CLASS } from "@/components/ui/form-action";

export const dynamic = "force-dynamic";

export default async function QrAdminPage() {
  const rows = await db().select().from(qrCodes).orderBy(qrCodes.position);
  const activeCount = rows.filter((qr) => qr.isActive).length;
  return (
    <div className="space-y-6">
      <AreaHeader eyebrow="Admin" title="QR codes" />
      <PageColumns
        side={
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <MiniStats>
                <MiniStat label="QR codes" value={rows.length} />
                <MiniStat label="Active" value={activeCount} />
              </MiniStats>
            </CardContent>
          </Card>
        }
        main={
          <>
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
                      {/* Delete beside Save, main action last (.cursor/rules/form-actions.mdc).
                          Its trigger is type="button" and its confirm submits the
                          separate delete form below via `form=`, so it never
                          submits this one. */}
                      <div className="flex flex-wrap justify-end gap-2 sm:col-span-2">
                        <ConfirmSubmitButton
                          formId={`delete-qr-form-${qr.id}`}
                          triggerLabel="Delete"
                          triggerVariant="outline"
                          triggerClassName="h-11"
                          title={`Delete the ${qr.bankName} QR code?`}
                          description="This removes it from checkout immediately. This can't be undone."
                          confirmLabel="Delete"
                        />
                        <SubmitButton className={FORM_ACTION_CLASS}>Save</SubmitButton>
                      </div>
                    </div>
                  </form>
                  {/* Outside the update form: forms can't nest. */}
                  <form id={`delete-qr-form-${qr.id}`} action={deleteQrCode}>
                    <input type="hidden" name="id" value={qr.id} />
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
                    <SubmitButton className={FORM_ACTION_CLASS}>Add QR code</SubmitButton>
                  </div>
                </form>
              </CardContent>
            </Card>
          </>
        }
      />
    </div>
  );
}
