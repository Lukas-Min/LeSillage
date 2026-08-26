"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
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
import { SubmitButton } from "@/components/ui/submit-button";

interface CheckoutTotals {
  merchandiseSubtotalCentavos: number;
  discountCentavos: number;
  deliveryFeeCentavos: number;
  totalCentavos: number;
  freeShipping: boolean;
}

export function CheckoutForm({
  defaultName,
  defaultEmail,
  totals,
  preloadedPhone = "",
}: {
  defaultName: string;
  defaultEmail: string;
  totals: CheckoutTotals;
  preloadedPhone?: string;
}) {
  const router = useRouter();
  const [fulfillmentMethod, setFulfillmentMethod] = useState<"DELIVERY" | "PICKUP">("DELIVERY");
  const [name, setName] = useState(defaultName);
  const [email, setEmail] = useState(defaultEmail);
  const [phone, setPhone] = useState(preloadedPhone.replace(/^\+?63/, "").replace(/^0/, "").replace(/\D/g, ""));
  const [region, setRegion] = useState("NCR");
  const [province, setProvince] = useState("Metro Manila");
  const [city, setCity] = useState("");
  const [barangay, setBarangay] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [street, setStreet] = useState("");
  const [pickupNotes, setPickupNotes] = useState("");
  const [notes, setNotes] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [isPending, startTransition] = useTransition();

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
          addressSnapshot:
            fulfillmentMethod === "DELIVERY"
              ? { region, province, city, barangay, postalCode, street }
              : null,
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
          <h2 className="font-serif-display text-lg">Fulfillment</h2>
          <div className="grid grid-cols-2 gap-2">
            <SubmitButton
              pendingLabel="Working…"
              type="button"
              variant={fulfillmentMethod === "DELIVERY" ? "default" : "outline"}
              onClick={() => setFulfillmentMethod("DELIVERY")}
            >
              Delivery · ₱120
            </SubmitButton>
            <SubmitButton
              pendingLabel="Working…"
              type="button"
              variant={fulfillmentMethod === "PICKUP" ? "default" : "outline"}
              onClick={() => setFulfillmentMethod("PICKUP")}
            >
              Pickup · Free
            </SubmitButton>
          </div>
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
            <div className="space-y-1 sm:col-span-2">
              <Label htmlFor="street">Street address</Label>
              <Input id="street" value={street} onChange={(event) => setStreet(event.target.value)} required />
            </div>
            <div className="space-y-1">
              <Label htmlFor="region">Region</Label>
              <Input id="region" value={region} onChange={(event) => setRegion(event.target.value)} required />
            </div>
            <div className="space-y-1">
              <Label htmlFor="province">Province</Label>
              <Input id="province" value={province} onChange={(event) => setProvince(event.target.value)} required />
            </div>
            <div className="space-y-1">
              <Label htmlFor="city">City / Municipality</Label>
              <Input id="city" value={city} onChange={(event) => setCity(event.target.value)} required />
            </div>
            <div className="space-y-1">
              <Label htmlFor="barangay">Barangay</Label>
              <Input id="barangay" value={barangay} onChange={(event) => setBarangay(event.target.value)} required />
            </div>
            <div className="space-y-1">
              <Label htmlFor="postalCode">Postal code</Label>
              <Input id="postalCode" value={postalCode} onChange={(event) => setPostalCode(event.target.value)} required minLength={4} />
            </div>
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
