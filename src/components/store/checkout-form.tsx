"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { formatPHP } from "@/domain/money";
import { PHONE_COUNTRY, PHONE_PLACEHOLDER } from "@/domain/phone";
import { createCheckoutOrder } from "@/actions/order-actions";
import { Price } from "@/components/store/price";
import type { CartLineView } from "@/lib/cart";
import type { CheckoutTotals } from "@/domain/checkout-totals";

interface SavedAddress {
  id: string;
  label: string | null;
  recipientName: string;
  phone: string;
  region: string;
  province: string;
  city: string;
  barangay: string;
  postalCode: string;
  street: string;
  isDefault: boolean;
}

export function CheckoutForm({
  defaultName,
  defaultEmail,
  preloadedPhone = "",
  lineItems,
  deliveryTotals,
  pickupTotals,
  addresses,
  defaultAddressId,
}: {
  defaultName: string;
  defaultEmail: string;
  preloadedPhone?: string;
  lineItems: CartLineView[];
  deliveryTotals: CheckoutTotals;
  pickupTotals: CheckoutTotals;
  addresses: SavedAddress[];
  defaultAddressId: string | null;
}) {
  const router = useRouter();
  const [fulfillmentMethod, setFulfillmentMethod] = useState<"DELIVERY" | "PICKUP">("DELIVERY");
  const [savedAddressId, setSavedAddressId] = useState<string>(defaultAddressId ?? "");
  const selected = addresses.find((address) => address.id === savedAddressId);
  const [name, setName] = useState(selected?.recipientName ?? defaultName);
  const [email, setEmail] = useState(defaultEmail);
  const [phone, setPhone] = useState(
    (selected?.phone ?? preloadedPhone).replace(/^\+?63/, "").replace(/^0/, "").replace(/\D/g, ""),
  );
  const [region, setRegion] = useState(selected?.region ?? "NCR");
  const [province, setProvince] = useState(selected?.province ?? "Metro Manila");
  const [city, setCity] = useState(selected?.city ?? "");
  const [barangay, setBarangay] = useState(selected?.barangay ?? "");
  const [postalCode, setPostalCode] = useState(selected?.postalCode ?? "");
  const [street, setStreet] = useState(selected?.street ?? "");
  const [pickupNotes, setPickupNotes] = useState("");
  const [notes, setNotes] = useState("");
  const [saveAddress, setSaveAddress] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [isPending, startTransition] = useTransition();
  const totals = fulfillmentMethod === "PICKUP" ? pickupTotals : deliveryTotals;

  const deliveryHint = useMemo(() => {
    if (fulfillmentMethod === "PICKUP") return "Pickup is always free and does not unlock delivery promos.";
    if (totals.freeShipping) return "Free delivery unlocked from discounted decants.";
    return `Add ${formatPHP(Math.max(0, 200000 - totals.decantSubtotalCentavos))} more in discounted decants for free delivery.`;
  }, [fulfillmentMethod, totals.freeShipping, totals.decantSubtotalCentavos]);

  function applyAddress(id: string) {
    setSavedAddressId(id);
    const next = addresses.find((address) => address.id === id);
    if (!next) return;
    setName(next.recipientName);
    setPhone(next.phone.replace(/^\+?63/, "").replace(/^0/, "").replace(/\D/g, ""));
    setRegion(next.region);
    setProvince(next.province);
    setCity(next.city);
    setBarangay(next.barangay);
    setPostalCode(next.postalCode);
    setStreet(next.street);
  }

  const onSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!accepted) {
      toast.error("Please accept the policies");
      return;
    }
    startTransition(async () => {
      try {
        const result = await createCheckoutOrder({
          fulfillmentMethod,
          recipientName: name,
          email,
          phone,
          savedAddressId: fulfillmentMethod === "DELIVERY" && savedAddressId ? savedAddressId : null,
          addressSnapshot:
            fulfillmentMethod === "DELIVERY" && !savedAddressId
              ? { region, province, city, barangay, postalCode, street }
              : null,
          saveAddress: fulfillmentMethod === "DELIVERY" && !savedAddressId && saveAddress,
          pickupNotes: fulfillmentMethod === "PICKUP" ? pickupNotes : null,
          notes: notes || null,
          acceptedTerms: true,
        });
        router.push(`/checkout/payment?orderNumber=${encodeURIComponent(result.orderNumber)}`);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Checkout failed");
      }
    });
  };

  return (
    <form onSubmit={onSubmit} className="mt-6 space-y-6">
      <Card>
        <CardContent className="space-y-3 p-4">
          <h2 className="font-serif-display text-lg">Items</h2>
          <ul className="space-y-3 text-sm">
            {lineItems.map((item) => (
              <li key={item.skuId} className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium">{item.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {item.skuLabel} · ×{item.quantity} · {item.fulfillment === "PRE_ORDER" ? "Pre-order" : "On hand"}
                  </p>
                </div>
                <Price
                  originalCentavos={item.originalUnitCentavos}
                  discountedCentavos={item.retailPriceCentavos}
                  quantity={item.quantity}
                  className="text-right"
                />
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="space-y-3 p-4">
          <h2 className="font-serif-display text-lg">Fulfillment</h2>
          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant={fulfillmentMethod === "DELIVERY" ? "default" : "outline"}
              onClick={() => setFulfillmentMethod("DELIVERY")}
            >
              Delivery · {deliveryTotals.deliveryFeeCentavos === 0 ? "Free" : formatPHP(deliveryTotals.deliveryFeeCentavos)}
            </Button>
            <Button
              type="button"
              variant={fulfillmentMethod === "PICKUP" ? "default" : "outline"}
              onClick={() => setFulfillmentMethod("PICKUP")}
            >
              Pickup · Free
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">{deliveryHint}</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2">
          <div className="space-y-1 sm:col-span-2">
            <Label htmlFor="name">Recipient name</Label>
            <Input id="name" value={name} onChange={(event) => setName(event.target.value)} required minLength={2} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
          </div>
          <div className="space-y-1">
            <Label htmlFor="phone">Mobile</Label>
            <div className="flex items-stretch gap-2">
              <span className="inline-flex items-center rounded-md border bg-secondary px-3 text-sm">
                {PHONE_COUNTRY}
              </span>
              <Input
                id="phone"
                type="tel"
                inputMode="numeric"
                autoComplete="tel-national"
                pattern="9[0-9]{9}"
                placeholder={PHONE_PLACEHOLDER}
                value={phone}
                onChange={(event) => setPhone(event.target.value.replace(/\D/g, "").replace(/^0/, ""))}
                required
                maxLength={10}
              />
            </div>
            <p className="text-xs text-muted-foreground">10 digits starting with 9. Do not include +63 or 0.</p>
          </div>
        </CardContent>
      </Card>
      {fulfillmentMethod === "DELIVERY" ? (
        <Card>
          <CardContent className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2">
            {addresses.length > 0 ? (
              <div className="space-y-1 sm:col-span-2">
                <Label htmlFor="savedAddress">Saved address</Label>
                <select
                  id="savedAddress"
                  className="h-11 w-full rounded-lg border bg-background px-3 text-sm"
                  value={savedAddressId}
                  onChange={(event) => {
                    if (event.target.value === "") {
                      setSavedAddressId("");
                      return;
                    }
                    applyAddress(event.target.value);
                  }}
                >
                  <option value="">New address</option>
                  {addresses.map((address) => (
                    <option key={address.id} value={address.id}>
                      {address.label ?? address.recipientName}
                      {address.isDefault ? " · Default" : ""}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}
            <div className="space-y-1 sm:col-span-2">
              <Label htmlFor="street">Street address</Label>
              <Input
                id="street"
                value={street}
                onChange={(event) => {
                  setStreet(event.target.value);
                  setSavedAddressId("");
                }}
                required={!savedAddressId}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="region">Region</Label>
              <Input id="region" value={region} onChange={(event) => { setRegion(event.target.value); setSavedAddressId(""); }} required={!savedAddressId} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="province">Province</Label>
              <Input id="province" value={province} onChange={(event) => { setProvince(event.target.value); setSavedAddressId(""); }} required={!savedAddressId} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="city">City / Municipality</Label>
              <Input id="city" value={city} onChange={(event) => { setCity(event.target.value); setSavedAddressId(""); }} required={!savedAddressId} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="barangay">Barangay</Label>
              <Input id="barangay" value={barangay} onChange={(event) => { setBarangay(event.target.value); setSavedAddressId(""); }} required={!savedAddressId} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="postalCode">Postal code</Label>
              <Input id="postalCode" value={postalCode} onChange={(event) => { setPostalCode(event.target.value); setSavedAddressId(""); }} required={!savedAddressId} minLength={4} />
            </div>
            {!savedAddressId ? (
              <label className="flex items-center gap-2 text-sm sm:col-span-2">
                <input type="checkbox" checked={saveAddress} onChange={(event) => setSaveAddress(event.target.checked)} />
                Save this address to my account
              </label>
            ) : null}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="space-y-2 p-4">
            <Label htmlFor="pickupNotes">Pickup instructions</Label>
            <Textarea
              id="pickupNotes"
              value={pickupNotes}
              onChange={(event) => setPickupNotes(event.target.value)}
              rows={3}
              placeholder="Anything we should know about your pickup?"
            />
          </CardContent>
        </Card>
      )}
      <Card>
        <CardContent className="space-y-3 p-4">
          <Label htmlFor="notes">Order notes (optional)</Label>
          <Textarea
            id="notes"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            rows={2}
            maxLength={280}
            placeholder="Gift message, special requests…"
          />
        </CardContent>
      </Card>
      <Card>
        <CardContent className="space-y-2 p-4 text-sm">
          <p className="flex justify-between">
            <span>Merchandise subtotal</span>
            <span>{formatPHP(totals.merchandiseSubtotalCentavos)}</span>
          </p>
          {totals.discountCentavos > 0 ? (
            <p className="flex justify-between">
              <span>Discount</span>
              <span>-{formatPHP(totals.discountCentavos)}</span>
            </p>
          ) : null}
          <p className="flex justify-between">
            <span>Delivery</span>
            <span>{totals.deliveryFeeCentavos === 0 ? "Free" : formatPHP(totals.deliveryFeeCentavos)}</span>
          </p>
          <Separator />
          <p className="flex justify-between font-medium">
            <span>Total to pay</span>
            <span>{formatPHP(totals.totalCentavos)}</span>
          </p>
          <label className="flex items-start gap-2 pt-3 text-xs">
            <input
              type="checkbox"
              checked={accepted}
              onChange={(event) => setAccepted(event.target.checked)}
              className="mt-1"
            />
            <span>I accept the policies and understand that payment is by QR upload and that stock is not reserved until the receipt is verified.</span>
          </label>
        </CardContent>
      </Card>
      <Button type="submit" size="lg" disabled={isPending || !accepted}>
        {isPending ? "Placing order…" : "Place order"}
      </Button>
    </form>
  );
}
