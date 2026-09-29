"use client";

import { useState } from "react";
import Link, { useLinkStatus } from "next/link";
import { usePathname } from "next/navigation";
import { Loader2, ShoppingBag } from "lucide-react";
import { useCart, useCartCount } from "@/components/store/cart-context";
import { CartLineItem, CartLineItemSkeleton } from "@/components/store/cart-line-item";
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

// /checkout does a real server-side fetch (auth, cart, addresses, provinces)
// before it can paint, so the navigation isn't instant — useLinkStatus lets
// this button show its own pending state the moment it's tapped, rather than
// looking unresponsive until the destination page appears.
function CheckoutLinkLabel() {
  const { pending } = useLinkStatus();
  return pending ? (
    <span className="inline-flex items-center gap-1.5">
      <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
      Checking out…
    </span>
  ) : (
    "Checkout"
  );
}

// Everything under the subtotal is static, so the loading state renders it
// for real too. `closeIfHere` shuts the drawer when a link points at the page
// already open, since no page change will do it.
function BagActions({ closeIfHere }: { closeIfHere: (href: string) => void }) {
  return (
    <>
      <p className="text-xs text-muted-foreground">Delivery fee calculated at checkout.</p>
      <Button asChild variant="gold" size="lg" className="h-11 w-full rounded-md">
        <Link href="/checkout" onClick={() => closeIfHere("/checkout")}>
          <CheckoutLinkLabel />
        </Link>
      </Button>
      <Button asChild variant="outline" size="lg" className="h-11 w-full rounded-md">
        <Link href="/cart" onClick={() => closeIfHere("/cart")}>
          View full cart
        </Link>
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
    </>
  );
}

export function CartDrawer({ mounted }: { mounted: boolean }) {
  const cart = useCart();
  const count = useCartCount();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  // The header lives in the root layout, so this drawer outlives navigation.
  // Close it whenever the page changes — Checkout, the sign-in page a
  // signed-out Checkout redirects to, a product link — rather than on tap, so
  // the Checkout button's own pending state still shows while /checkout loads.
  // Adjusting state during render is React's supported way to follow a change.
  const [openOn, setOpenOn] = useState(pathname);
  if (pathname !== openOn) {
    setOpenOn(pathname);
    setOpen(false);
  }
  const closeIfHere = (href: string) => {
    if (pathname === href) setOpen(false);
  };
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon-lg" aria-label="Cart" className="relative min-h-11 min-w-11">
          <ShoppingBag className="h-5 w-5" />
          {mounted && count > 0 ? (
            <span className="absolute top-1 right-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-gold px-1 text-[11px] sm:text-[10px] font-semibold text-charcoal">
              {count}
            </span>
          ) : null}
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full gap-0 data-[side=right]:w-full sm:max-w-md">
        <SheetHeader className="border-b border-border/60">
          <SheetTitle className="font-serif-display text-2xl">Your bag</SheetTitle>
        </SheetHeader>
        {cart.loading ? (
          <div className="flex min-h-0 flex-1 flex-col">
            <div className="flex items-center justify-between px-4 pt-3">
              <Skeleton className="h-4 w-14" />
              <Skeleton className="h-7 w-24" />
            </div>
            <ul className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
              {Array.from({ length: 2 }).map((_, index) => (
                <li key={index}>
                  <CartLineItemSkeleton layout="drawer" />
                </li>
              ))}
            </ul>
            <div className="space-y-3 border-t border-border/60 px-4 py-4">
              <div className="flex items-center justify-between text-sm">
                <span>Subtotal</span>
                <Skeleton className="h-7 w-24" />
              </div>
              <BagActions closeIfHere={closeIfHere} />
            </div>
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
            {cart.locked ? (
              <p className="px-4 pt-2 text-xs text-muted-foreground">
                Your bag is locked while you&apos;re checking out.
              </p>
            ) : null}
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
                <span className="font-price-display text-lg">
                  {formatPHP(cart.totals.merchandiseSubtotalCentavos)}
                </span>
              </p>
              <BagActions closeIfHere={closeIfHere} />
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
