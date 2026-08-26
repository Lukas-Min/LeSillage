import { requireActiveCustomer } from "@/auth";
import { db } from "@/db/client";
import { addresses } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/ui/submit-button";
import { createAddress, deleteAddress, setDefaultAddressForm, updateAddress } from "@/actions/account-actions";

export const dynamic = "force-dynamic";

export default async function AddressesPage() {
  const user = await requireActiveCustomer();
  const rows = await db()
    .select()
    .from(addresses)
    .where(eq(addresses.userId, user.id))
    .orderBy(desc(addresses.createdAt));
  return (
    <div className="space-y-4">
      <h1 className="font-serif-display text-2xl">Saved addresses</h1>
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">You have no saved addresses yet.</p>
      ) : (
        rows.map((address) => (
          <Card key={address.id}>
            <CardHeader>
              <CardTitle className="text-base">
                {address.label ?? address.recipientName}
                {address.isDefault ? " · Default" : ""}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <form action={updateAddress} className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <input type="hidden" name="addressId" value={address.id} />
                <Input name="label" defaultValue={address.label ?? ""} placeholder="Label" />
                <Input name="recipientName" defaultValue={address.recipientName} required />
                <Input name="phone" defaultValue={address.phone.replace(/^\+63/, "")} required />
                <Input name="street" defaultValue={address.street} required className="sm:col-span-2" />
                <Input name="barangay" defaultValue={address.barangay} required />
                <Input name="city" defaultValue={address.city} required />
                <Input name="province" defaultValue={address.province} required />
                <Input name="region" defaultValue={address.region} required />
                <Input name="postalCode" defaultValue={address.postalCode} required />
                <label className="flex items-center gap-2 text-xs sm:col-span-2">
                  <input type="checkbox" name="isDefault" defaultChecked={address.isDefault} />
                  Default address
                </label>
                <SubmitButton>Save</SubmitButton>
              </form>
              <div className="flex gap-2">
                <form action={setDefaultAddressForm}>
                  <input type="hidden" name="addressId" value={address.id} />
                  <SubmitButton variant="outline">Make default</SubmitButton>
                </form>
                <form action={deleteAddress}>
                  <input type="hidden" name="addressId" value={address.id} />
                  <SubmitButton variant="destructive">Delete</SubmitButton>
                </form>
              </div>
            </CardContent>
          </Card>
        ))
      )}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Add address</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createAddress} className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <div className="space-y-1 sm:col-span-2">
              <Label htmlFor="recipientName">Recipient</Label>
              <Input id="recipientName" name="recipientName" required />
            </div>
            <Input name="phone" placeholder="9171234567" required />
            <Input name="label" placeholder="Home, office…" />
            <Input name="street" placeholder="Street" required className="sm:col-span-2" />
            <Input name="barangay" placeholder="Barangay" required />
            <Input name="city" placeholder="City" required />
            <Input name="province" defaultValue="Metro Manila" required />
            <Input name="region" defaultValue="NCR" required />
            <Input name="postalCode" placeholder="Postal code" required />
            <label className="flex items-center gap-2 text-xs sm:col-span-2">
              <input type="checkbox" name="isDefault" />
              Set as default
            </label>
            <SubmitButton>Save address</SubmitButton>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
