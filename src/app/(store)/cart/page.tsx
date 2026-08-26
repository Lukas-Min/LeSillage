"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Trash2 } from "lucide-react";
import { useCart } from "@/components/store/cart-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { formatPHP } from "@/domain/money";
import { isFreeShippingEligible, isTesterBonusEligible } from "@/domain/promo";
import { Input } from "@/components/ui/input";

export default function CartPage() {
  const cart = useCart();
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    Promise.resolve().then(() => setMounted(true));
  }, []);

  const decantSubtotal = useMemo(() => {
    return cart.items
      .filter((item) => item.productType === "DECANT")
      .reduce((sum, item) => sum + item.retailPriceCentavos * item.quantity, 0);
  }, [cart.items]);

  const linesForPromo = cart.items.map((item) => ({
    productType: item.productType,
    discountedLineTotalCentavos: item.retailPriceCentavos * item.quantity,
  }));

  const freeShipping = isFreeShippingEligible(linesForPromo, {
    decantThresholdCentavos: 200000,
    deliveryFeeCentavos: 12000,
    freeDeliveryEnabled: true,
    testerBonusEnabled: true,
  });
  const testerBonus = isTesterBonusEligible(linesForPromo, {
    decantThresholdCentavos: 200000,
    deliveryFeeCentavos: 12000,
    freeDeliveryEnabled: true,
    testerBonusEnabled: true,
  });

  const subtotal = cart.items.reduce(
    (sum, item) => sum + item.retailPriceCentavos * item.quantity,
    0,
  );
  const deliveryFee = freeShipping ? 0 : 12000;

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8">
      <h1 className="font-serif-display text-2xl">Your cart</h1>
      {!mounted ? null : cart.items.length === 0 ? (
        <Card className="mt-6">
          <CardContent className="space-y-3 p-6 text-center">
            <p className="text-muted-foreground">Your cart is empty.</p>
            <Button asChild>
              <Link href="/shop">Browse the catalog</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="mt-6 space-y-4">
          {cart.items.map((item) => (
            <Card key={item.skuId}>
              <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
                <div className="flex-1">
                  <p className="font-serif-display text-base">{item.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {item.skuLabel} · {item.fulfillment === "PRE_ORDER" ? "Pre-order" : "On hand"}
                  </p>
                  <p className="mt-1 text-sm">{formatPHP(item.retailPriceCentavos)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={1}
                    value={item.quantity}
                    onChange={(event) => {
                      const next = Number(event.target.value);
                      if (Number.isFinite(next)) cart.setQuantity(item.skuId, next);
                    }}
                    className="h-10 w-16"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Remove"
                    onClick={() => cart.remove(item.skuId)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
          <Separator />
          <Card>
            <CardHeader>
              <CardTitle className="font-serif-display text-base">Order summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-sm">
              <p className="flex justify-between">
                <span>Subtotal</span>
                <span>{formatPHP(subtotal)}</span>
              </p>
              <p className="flex justify-between">
                <span>Delivery fee</span>
                <span>{deliveryFee === 0 ? "Free" : formatPHP(deliveryFee)}</span>
              </p>
              <p className="flex justify-between font-medium">
                <span>Total</span>
                <span>{formatPHP(subtotal + deliveryFee)}</span>
              </p>
              <p className="text-xs text-muted-foreground">
                Decant subtotal: {formatPHP(decantSubtotal)} · free shipping unlocks at ₱2,000.
                {freeShipping ? " Unlocked." : testerBonus ? "" : ""}
              </p>
            </CardContent>
            <CardFooter className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-muted-foreground">
                You will be asked to sign in or create an account to checkout.
              </p>
              <Button asChild size="lg">
                <Link href="/checkout">Checkout</Link>
              </Button>
            </CardFooter>
          </Card>
        </div>
      )}
    </main>
  );
}