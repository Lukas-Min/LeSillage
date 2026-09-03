"use client";

import Link from "next/link";
import { useCart } from "@/components/store/cart-context";
import { CartLineItem } from "@/components/store/cart-line-item";
import { Button } from "@/components/ui/button";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { DisclosureAccordion } from "@/components/ui/disclosure-accordion";
import { formatPHP, DECANT_PROMO_THRESHOLD_CENTAVOS } from "@/domain/money";
import { policyCopy } from "@/lib/policy-copy";

export default function CartPage() {
  const cart = useCart();

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8">
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Cart" }]} />
      <h1 className="font-serif-display text-2xl">Your cart</h1>
      {cart.items.length === 0 ? (
        <Card className="mt-6">
          <CardContent className="space-y-3 p-6 text-center">
            <p className="text-muted-foreground">Your cart is empty.</p>
            <Button asChild variant="gold" size="lg" className="h-11 rounded-md">
              <Link href="/shop">Browse the shop</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="mt-6 space-y-4">
          {cart.items.map((item) => (
            <CartLineItem key={item.skuId} item={item} layout="page" />
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
                {cart.totals.freeShipping
                  ? `Free delivery unlocked${cart.totals.testerBonusEligible ? ", plus a free tester" : ""} from your decants.`
                  : `Add ${formatPHP(Math.max(0, DECANT_PROMO_THRESHOLD_CENTAVOS - cart.totals.decantSubtotalCentavos))} more in decants to unlock free delivery and a free tester.`}
              </p>
            </CardContent>
            <CardFooter className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-muted-foreground">Sign in is required to checkout.</p>
              <Button asChild variant="gold" size="lg" className="h-11 rounded-md">
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
