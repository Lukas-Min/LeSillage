import { desc, eq } from "drizzle-orm";
import { MapPin } from "lucide-react";
import { requireActiveCustomer } from "@/auth";
import { db } from "@/db/client";
import { addresses } from "@/db/schema";
import { SectionCard, EmptyState, Eyebrow } from "@/components/ui/section";
import { AreaHeader, PageColumns } from "@/components/ui/page-layout";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/ui/submit-button";
import { Badge } from "@/components/ui/badge";
import { PhAddressFields } from "@/components/store/ph-address-fields";
import { fetchProvinceOptions } from "@/lib/ph-locations";
import { createAddress, deleteAddress, setDefaultAddressForm, updateAddress } from "@/actions/account-actions";

export const dynamic = "force-dynamic";

const ADDRESS_FIELD_NAMES = {
  region: "region",
  province: "province",
  city: "city",
  barangay: "barangay",
  postalCode: "postalCode",
  street: "street",
} as const;

export default async function AddressesPage() {
  const user = await requireActiveCustomer();
  const [rows, provinces] = await Promise.all([
    db().select().from(addresses).where(eq(addresses.userId, user.id)).orderBy(desc(addresses.createdAt)),
    fetchProvinceOptions(),
  ]);
  return (
    <div className="space-y-6">
      <AreaHeader
        eyebrow="Addresses"
        title="Where we ship to"
        subtitle="Save up to 5 addresses. Mark your default so checkout is one tap."
      />

      <PageColumns
        main={
          <>
            {rows.length === 0 ? (
              <EmptyState
                eyebrow="No saved addresses"
                title="Add your first delivery address"
                description="You can edit or remove it any time. We never share your address."
              />
            ) : (
              <ul className="space-y-4">
                {rows.map((address) => (
                  <li key={address.id}>
                    <SectionCard
                      eyebrow={address.label ?? "Address"}
                      title={address.recipientName}
                      description={`${address.street}, ${address.barangay}, ${address.city}, ${address.province} · ${address.postalCode}`}
                      actions={
                        address.isDefault ? <Badge variant="default">Default</Badge> : null
                      }
                      contentClassName="space-y-3"
                    >
                      <form action={updateAddress} className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                        <input type="hidden" name="addressId" value={address.id} />
                        <div className="space-y-1 sm:col-span-2">
                          <Label htmlFor={`label-${address.id}`}>Label</Label>
                          <Input
                            id={`label-${address.id}`}
                            name="label"
                            defaultValue={address.label ?? ""}
                            placeholder="Home, Office…"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor={`recipient-${address.id}`}>Recipient</Label>
                          <Input
                            id={`recipient-${address.id}`}
                            name="recipientName"
                            defaultValue={address.recipientName}
                            required
                          />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor={`phone-${address.id}`}>Mobile (PH)</Label>
                          <Input
                            id={`phone-${address.id}`}
                            name="phone"
                            defaultValue={address.phone.replace(/^\+63/, "")}
                            required
                          />
                        </div>
                        <PhAddressFields
                          idPrefix={`address-${address.id}`}
                          provinces={provinces}
                          fieldNames={ADDRESS_FIELD_NAMES}
                          defaultProvinceName={address.province}
                          defaultCityName={address.city}
                          defaultBarangayName={address.barangay}
                          defaultPostalCode={address.postalCode}
                          defaultStreet={address.street}
                        />
                        <label className="flex items-center gap-2 text-xs sm:col-span-2">
                          <input type="checkbox" name="isDefault" defaultChecked={address.isDefault} />
                          Set as default
                        </label>
                        <div className="flex flex-wrap gap-2 sm:col-span-2 sm:justify-end">
                          <SubmitButton size="sm" className="sm:w-auto" pendingLabel="Saving…">Save</SubmitButton>
                          {/* formAction, not nested forms: a <form> inside this edit
                              form is dropped by the browser, so these buttons used to
                              submit the edit (Save) instead. They post the same
                              addressId to their own action. */}
                          {!address.isDefault ? (
                            <SubmitButton
                              size="sm"
                              variant="outline"
                              pendingLabel="Setting…"
                              formAction={setDefaultAddressForm}
                              formNoValidate
                            >
                              Make default
                            </SubmitButton>
                          ) : null}
                          <SubmitButton
                            size="sm"
                            variant="destructive"
                            pendingLabel="Deleting…"
                            formAction={deleteAddress}
                            formNoValidate
                          >
                            Delete
                          </SubmitButton>
                        </div>
                      </form>
                    </SectionCard>
                  </li>
                ))}
              </ul>
            )}

            <p className="text-xs text-muted-foreground">
              <Eyebrow className="inline">Privacy</Eyebrow>{" "}
              Addresses are encrypted in transit and used only for shipping and pickup.
            </p>
          </>
        }
        side={
          <SectionCard
            eyebrow="Add"
            title="New address"
            description="We will prefill Metro Manila. Adjust to match your address."
            actions={<MapPin className="h-4 w-4 text-gold" />}
          >
            <form action={createAddress} className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-1 xl:[&>*]:col-span-1!">
              <div className="space-y-1">
                <Label htmlFor="new-recipient">Recipient</Label>
                <Input id="new-recipient" name="recipientName" required />
              </div>
              <div className="space-y-1">
                <Label htmlFor="new-phone">Mobile (PH)</Label>
                <Input id="new-phone" name="phone" placeholder="9171234567" required />
              </div>
              <PhAddressFields idPrefix="new-address" provinces={provinces} fieldNames={ADDRESS_FIELD_NAMES} />
              <div className="space-y-1">
                <Label htmlFor="new-label">Label</Label>
                <Input id="new-label" name="label" placeholder="Home, Office…" />
              </div>
              <label className="flex items-center gap-2 text-xs sm:col-span-2">
                <input type="checkbox" name="isDefault" />
                Set as default
              </label>
              <div className="sm:col-span-2 sm:flex sm:justify-end">
                <SubmitButton className="h-11 w-full sm:w-auto" pendingLabel="Saving…">Save</SubmitButton>
              </div>
            </form>
          </SectionCard>
        }
      />
    </div>
  );
}