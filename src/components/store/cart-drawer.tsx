"use client";

import Link from "next/link";
import { ShoppingBag } from "lucide-react";
import { useCart, useCartCount } from "@/components/store/cart-context";
import { CartLineItem } from "@/components/store/cart-line-item";
import { ClearCartButton } from "@/components/store/clear-cart-button";
import { Button } from "@/components/ui/button";
import { DisclosureAccordion } from "@/components/ui/disclosure-accordion";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { formatPHP } from "@/domain/money";
import { policyCopy } from "@/lib/policy-copy";

export function CartDrawer({ mounted }: { mounted: boolean }) {
  const cart = useCart();
  const count = useCartCount();
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon-lg" aria-label="Cart" className="relative min-h-11 min-w-11">
          <ShoppingBag className="h-5 w-5" />
          {mounted && count > 0 ? (
            <span className="absolute top-1 right-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-gold px-1 text-[10px] font-semibold text-charcoal">
              {count}
            </span>
          ) : null}
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full gap-0 sm:max-w-md">
        <SheetHeader className="border-b border-border/60">
          <SheetTitle className="font-serif-display text-2xl">Your bag</SheetTitle>
        </SheetHeader>
        {cart.loading ? (
          <div className="flex-1 space-y-3 px-4 py-4">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        ) : cart.items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full border border-border">
              <ShoppingBag className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
            </span>
            <p className="font-serif-display text-xl">Your bag is empty</p>
            <p className="text-sm text-muted-foreground">
              Full bottles, partials, and decants — the shelf is waiting.
            </p>
            <Button asChild variant="outline" className="rounded-md">
              <Link href="/shop">Browse the catalog</Link>
            </Button>
          </div>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col">
            <div className="flex items-center justify-between px-4 pt-3">
              <p className="text-xs text-muted-foreground">
                {count} item{count === 1 ? "" : "s"}
              </p>
              <ClearCartButton />
            </div>
            <ul className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
              {cart.items.map((item) => (
                <li key={item.skuId}>
                  <CartLineItem item={item} layout="drawer" />
                </li>
              ))}
            </ul>
            <div className="space-y-3 border-t border-border/60 px-4 py-4">
              <p className="flex justify-between text-sm">
                <span>Subtotal</span>
                <span className="font-serif-display text-lg">
                  {formatPHP(cart.totals.merchandiseSubtotalCentavos)}
                </span>
              </p>
              <p className="text-xs text-muted-foreground">Delivery fee calculated at checkout.</p>
              <Button asChild variant="gold" size="lg" className="h-11 w-full rounded-md">
                <Link href="/checkout">Checkout</Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="h-11 w-full rounded-md">
                <Link href="/cart">View full cart</Link>
              </Button>
              <DisclosureAccordion
                items={[
                  {
                    id: "shipping",
                    label: policyCopy.shipping.label,
                    content: <p>{policyCopy.shipping.body}</p>,
                  },
                  {
                    id: "returns",
                    label: policyCopy.returns.label,
                    content: <p>{policyCopy.returns.body}</p>,
                  },
                ]}
              />
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
