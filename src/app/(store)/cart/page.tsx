"use client";

import Link from "next/link";
import { Trash2 } from "lucide-react";
import { useCart } from "@/components/store/cart-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { DisclosureAccordion } from "@/components/ui/disclosure-accordion";
import { formatPHP } from "@/domain/money";
import { Input } from "@/components/ui/input";
import { Price } from "@/components/store/price";
import { policyCopy } from "@/lib/policy-copy";

export default function CartPage() {
  const cart = useCart();

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8">
      <h1 className="font-serif-display text-2xl">Your cart</h1>
      {cart.items.length === 0 ? (
        <Card className="mt-6">
          <CardContent className="space-y-3 p-6 text-center">
            <p className="text-muted-foreground">Your cart is empty.</p>
            <Button asChild variant="gold" className="rounded-md">
              <Link href="/shop">Browse the shop</Link>
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
                  <Price
                    originalCentavos={item.originalUnitCentavos}
                    discountedCentavos={item.retailPriceCentavos}
                    className="mt-1 block"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={1}
                    max={item.maxQuantity}
                    value={item.quantity}
                    onChange={(event) => {
                      const next = Number(event.target.value);
                      if (Number.isFinite(next)) cart.setQuantity(item.skuId, next);
                    }}
                    className="h-11 w-16"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Remove"
                    className="min-h-11 min-w-11"
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
                <span>{formatPHP(cart.totals.merchandiseSubtotalCentavos)}</span>
              </p>
              {cart.totals.discountCentavos > 0 ? (
                <p className="flex justify-between">
                  <span>Discount</span>
                  <span>-{formatPHP(cart.totals.discountCentavos)}</span>
                </p>
              ) : null}
              <p className="flex justify-between">
                <span>Delivery fee</span>
                <span>{cart.totals.deliveryFeeCentavos === 0 ? "Free" : formatPHP(cart.totals.deliveryFeeCentavos)}</span>
              </p>
              <p className="flex justify-between font-medium">
                <span>Total</span>
                <span>{formatPHP(cart.totals.totalCentavos)}</span>
              </p>
              <p className="text-xs text-muted-foreground">
                Decant subtotal: {formatPHP(cart.totals.decantSubtotalCentavos)} · free shipping unlocks at ₱2,000
                {cart.totals.freeShipping ? " · unlocked." : "."}
                {cart.totals.testerBonusEligible ? " Tester bonus unlocked." : ""}
              </p>
            </CardContent>
            <CardFooter className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-muted-foreground">Sign in is required to checkout.</p>
              <Button asChild variant="gold" size="lg" className="rounded-md">
                <Link href="/checkout">Checkout</Link>
              </Button>
            </CardFooter>
            <div className="border-t border-border/60 px-4 pb-4 pt-2 sm:px-6 sm:pb-6">
              <DisclosureAccordion
                items={[
                  {
                    id: "shipping",
                    label: policyCopy.shipping.label,
                    defaultOpen: true,
                    content: <p>{policyCopy.shipping.body}</p>,
                  },
                  {
                    id: "returns",
                    label: policyCopy.returns.label,
                    defaultOpen: true,
                    content: <p>{policyCopy.returns.body}</p>,
                  },
                ]}
              />
            </div>
          </Card>
        </div>
      )}
    </main>
  );
}
