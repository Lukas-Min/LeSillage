"use client";

import Link from "next/link";
import { useCart } from "@/components/store/cart-context";
import { CartLineItem } from "@/components/store/cart-line-item";
import { ClearCartButton } from "@/components/store/clear-cart-button";
import { Button } from "@/components/ui/button";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { DisclosureAccordion } from "@/components/ui/disclosure-accordion";
import { formatPHP, DECANT_PROMO_THRESHOLD_CENTAVOS } from "@/domain/money";
import { policyCopy } from "@/lib/policy-copy";

export default function CartPage() {
  const cart = useCart();

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8">
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Cart" }]} />
      <div className="flex items-center justify-between gap-2">
        <h1 className="font-serif-display text-2xl">Your cart</h1>
        <ClearCartButton />
      </div>
      {cart.loading ? (
        <div className="mt-6 space-y-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Separator />
          <Skeleton className="h-64 w-full" />
        </div>
      ) : cart.items.length === 0 ? (
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
            <CardContent className="text-sm">
              <ul className="space-y-4">
                {cart.items
                  .filter((item) => item.available)
                  .map((item) => (
                    <li key={item.skuId} className="flex items-start justify-between gap-3">
                      <div className="space-y-0.5">
                        <p className="font-medium">{item.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {item.skuLabel} · {item.fulfillment === "PRE_ORDER" ? "Pre-order" : "On hand"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatPHP(item.retailPriceCentavos)} <span className="tabular-nums">× {item.quantity}</span>
                        </p>
                      </div>
                      <div className="shrink-0 text-right tabular-nums">
                        <p className="font-medium">{formatPHP(item.lineTotalCentavos)}</p>
                        {item.originalUnitCentavos > item.retailPriceCentavos ? (
                          <p className="text-xs text-muted-foreground line-through">
                            {formatPHP(item.originalUnitCentavos * item.quantity)}
                          </p>
                        ) : null}
                      </div>
                    </li>
                  ))}
              </ul>
              <Separator className="my-4" />
              <div className="space-y-1.5 text-muted-foreground">
                <p className="flex justify-between">
                  <span>Subtotal</span>
                  <span className="tabular-nums text-foreground">{formatPHP(cart.totals.merchandiseSubtotalCentavos)}</span>
                </p>
                <p className="flex justify-between">
                  <span>Delivery fee</span>
                  <span className="tabular-nums text-foreground">
                    {cart.totals.deliveryFeeCentavos === 0 ? "Free" : formatPHP(cart.totals.deliveryFeeCentavos)}
                  </span>
                </p>
              </div>
              <Separator className="my-3" />
              <p className="flex items-baseline justify-between">
                <span className="font-serif-display text-lg text-foreground">Total</span>
                <span className="font-serif-display text-2xl tabular-nums">{formatPHP(cart.totals.totalCentavos)}</span>
              </p>
              {cart.totals.discountCentavos > 0 ? (
                <p className="mt-1 flex justify-between text-xs text-muted-foreground">
                  <span>You saved</span>
                  <span className="tabular-nums">{formatPHP(cart.totals.discountCentavos)}</span>
                </p>
              ) : null}
              <p className="mt-3 border-t pt-3 text-xs text-muted-foreground">
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
