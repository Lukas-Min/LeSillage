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
import { previewPromoCode, type PromoCodePreview } from "@/actions/promo-code-actions";
import { Price } from "@/components/store/price";
import { PhAddressFields, type PhAddressValues } from "@/components/store/ph-address-fields";
import type { CartLineView } from "@/lib/cart";
import type { CheckoutTotals } from "@/domain/checkout-totals";
import type { PhProvinceOption } from "@/lib/ph-locations";

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
  provinces,
}: {
  defaultName: string;
  defaultEmail: string;
  preloadedPhone?: string;
  lineItems: CartLineView[];
  deliveryTotals: CheckoutTotals;
  pickupTotals: CheckoutTotals;
  addresses: SavedAddress[];
  defaultAddressId: string | null;
  provinces: PhProvinceOption[];
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
  const [addressValues, setAddressValues] = useState<PhAddressValues>({
    region: selected?.region ?? "",
    province: selected?.province ?? "",
    city: selected?.city ?? "",
    barangay: selected?.barangay ?? "",
    postalCode: selected?.postalCode ?? "",
    street: selected?.street ?? "",
  });
  const [pickupNotes, setPickupNotes] = useState("");
  const [notes, setNotes] = useState("");
  const [saveAddress, setSaveAddress] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [promoCodeInput, setPromoCodeInput] = useState("");
  const [appliedPromoCode, setAppliedPromoCode] = useState<PromoCodePreview | null>(null);
  const [promoCodeError, setPromoCodeError] = useState<string | null>(null);
  const [promoCodePending, startPromoCodeTransition] = useTransition();
  const totals = fulfillmentMethod === "PICKUP" ? pickupTotals : deliveryTotals;
  const promoDiscountCentavos = appliedPromoCode
    ? appliedPromoCode.orderDiscountCentavos + appliedPromoCode.deliveryDiscountCentavos
    : 0;
  const displayedTotalCentavos = Math.max(0, totals.totalCentavos - promoDiscountCentavos);

  function applyPromoCode() {
    const code = promoCodeInput.trim();
    if (!code) return;
    setPromoCodeError(null);
    startPromoCodeTransition(async () => {
      try {
        const result = await previewPromoCode(code, fulfillmentMethod);
        setAppliedPromoCode(result);
      } catch (error) {
        setAppliedPromoCode(null);
        setPromoCodeError(error instanceof Error ? error.message : "Invalid promo code");
      }
    });
  }

  function removePromoCode() {
    setAppliedPromoCode(null);
    setPromoCodeInput("");
    setPromoCodeError(null);
  }

  function changeFulfillmentMethod(next: "DELIVERY" | "PICKUP") {
    setFulfillmentMethod(next);
    // A DELIVERY-scope code's discount depends on the delivery fee, which
    // goes to zero on pickup (and back on delivery) — clear it so a stale
    // preview isn't shown; an ORDER-scope code doesn't depend on
    // fulfillment method, so it's left applied.
    if (appliedPromoCode?.scope === "DELIVERY") {
      setAppliedPromoCode(null);
      setPromoCodeError(null);
    }
  }

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
    // Province/city/barangay/postal/street: PhAddressFields is keyed by
    // savedAddressId below, so setting it here remounts that component
    // fresh with this address's values as its new defaults — it reports
    // them back via handleAddressChange once resolved against the live
    // PSGC option lists.
  }

  function handleAddressChange(values: PhAddressValues) {
    setAddressValues(values);
    // Editing a field away from the currently-selected saved address's own
    // values means the customer wants something other than that exact
    // saved address — stop submitting it as savedAddressId (which would
    // otherwise silently override these edits with the saved record's
    // original fields server-side) and fall through to the addressSnapshot
    // path instead. A remount from picking a *different* saved address (or
    // "New address") always matches on the first render, so this never
    // fires spuriously right after a selection.
    if (savedAddressId && selected) {
      const matchesSelected =
        values.province === selected.province &&
        values.city === selected.city &&
        values.barangay === selected.barangay &&
        values.postalCode === selected.postalCode &&
        values.street === selected.street;
      if (!matchesSelected) setSavedAddressId("");
    }
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
          addressSnapshot: fulfillmentMethod === "DELIVERY" && !savedAddressId ? addressValues : null,
          saveAddress: fulfillmentMethod === "DELIVERY" && !savedAddressId && saveAddress,
          pickupNotes: fulfillmentMethod === "PICKUP" ? pickupNotes : null,
          notes: notes || null,
          acceptedTerms: true,
          promoCode: appliedPromoCode?.code ?? null,
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
          <h2 className="font-serif-display text-lg">Fulfillment</h2>
          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant={fulfillmentMethod === "DELIVERY" ? "default" : "outline"}
              onClick={() => changeFulfillmentMethod("DELIVERY")}
            >
              Delivery · {deliveryTotals.deliveryFeeCentavos === 0 ? "Free" : formatPHP(deliveryTotals.deliveryFeeCentavos)}
            </Button>
            <Button
              type="button"
              variant={fulfillmentMethod === "PICKUP" ? "default" : "outline"}
              onClick={() => changeFulfillmentMethod("PICKUP")}
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
            <PhAddressFields
              key={savedAddressId || "new"}
              provinces={provinces}
              defaultProvinceName={selected?.province}
              defaultCityName={selected?.city}
              defaultBarangayName={selected?.barangay}
              defaultPostalCode={selected?.postalCode}
              defaultStreet={selected?.street}
              onChange={handleAddressChange}
            />
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
        <CardContent className="space-y-3 p-4">
          <Label htmlFor="promoCode">Promo code</Label>
          {appliedPromoCode ? (
            <div className="flex items-center justify-between gap-2 rounded-md border border-gold/40 bg-gold/5 px-3 py-2 text-sm">
              <span className="font-mono font-medium">{appliedPromoCode.code}</span>
              <button type="button" onClick={removePromoCode} className="text-xs text-muted-foreground underline-offset-4 hover:underline">
                Remove
              </button>
            </div>
          ) : (
            <div className="flex gap-2">
              <Input
                id="promoCode"
                value={promoCodeInput}
                onChange={(event) => setPromoCodeInput(event.target.value.toUpperCase())}
                placeholder="e.g. WELCOME10"
                className="uppercase"
              />
              <Button type="button" variant="outline" onClick={applyPromoCode} disabled={promoCodePending || !promoCodeInput.trim()}>
                {promoCodePending ? "Checking…" : "Apply"}
              </Button>
            </div>
          )}
          {promoCodeError ? <p className="text-xs text-destructive">{promoCodeError}</p> : null}
        </CardContent>
      </Card>
      <Card>
        <CardContent className="space-y-2 p-4 text-sm">
          <h2 className="font-serif-display text-lg">Order summary</h2>
          <ul className="space-y-3">
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
          <Separator />
          {/* merchandiseSubtotalCentavos is already post-item-discount (see
              priceCart) — discountCentavos below is shown as an
              informational note, not subtracted again; only the promo-code
              lines below are real subtractions (see displayedTotalCentavos). */}
          <p className="flex justify-between">
            <span>Merchandise subtotal</span>
            <span>{formatPHP(totals.merchandiseSubtotalCentavos)}</span>
          </p>
          {appliedPromoCode && appliedPromoCode.orderDiscountCentavos > 0 ? (
            <p className="flex justify-between">
              <span>Promo code ({appliedPromoCode.code})</span>
              <span>-{formatPHP(appliedPromoCode.orderDiscountCentavos)}</span>
            </p>
          ) : null}
          <p className="flex justify-between">
            <span>Delivery</span>
            <span>{totals.deliveryFeeCentavos === 0 ? "Free" : formatPHP(totals.deliveryFeeCentavos)}</span>
          </p>
          {appliedPromoCode && appliedPromoCode.deliveryDiscountCentavos > 0 ? (
            <p className="flex justify-between">
              <span>Delivery discount ({appliedPromoCode.code})</span>
              <span>-{formatPHP(appliedPromoCode.deliveryDiscountCentavos)}</span>
            </p>
          ) : null}
          <Separator />
          <p className="flex justify-between font-medium">
            <span>Total to pay</span>
            <span>{formatPHP(displayedTotalCentavos)}</span>
          </p>
          {totals.discountCentavos > 0 ? (
            <p className="flex justify-between text-xs text-muted-foreground">
              <span>You saved</span>
              <span>{formatPHP(totals.discountCentavos)}</span>
            </p>
          ) : null}
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
      <Button type="submit" variant="gold" size="lg" className="h-11 rounded-md" disabled={isPending || !accepted}>
        {isPending ? "Placing order…" : "Place order"}
      </Button>
    </form>
  );
}
