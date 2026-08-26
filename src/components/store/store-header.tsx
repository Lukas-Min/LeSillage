"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ShoppingBag, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCartCount } from "@/components/store/cart-context";

export function StoreHeader({
  signedIn,
  isAdmin,
  role,
}: {
  signedIn: boolean;
  isAdmin: boolean;
  role: "ADMIN" | "CUSTOMER" | null;
}) {
  const count = useCartCount();
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    Promise.resolve().then(() => setMounted(true));
  }, []);
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4">
        <Link href="/" className="flex items-center gap-2 font-serif-display text-lg">
          <span className="inline-block h-2 w-2 rounded-full bg-gold" />
          Le Sillage
        </Link>
        <nav className="hidden gap-4 text-sm md:flex">
          <Link href="/shop" className="hover:text-gold">Shop</Link>
          <Link href="/collections/niche" className="hover:text-gold">Niche</Link>
          <Link href="/collections/designer" className="hover:text-gold">Designer</Link>
          <Link href="/collections/middle-eastern" className="hover:text-gold">ME</Link>
          <Link href="/brands" className="hover:text-gold">Brands</Link>
          <Link href="/search" className="hover:text-gold">Search</Link>
          <Link href="/how-to-pay" className="hover:text-gold">How to pay</Link>
          <Link href="/contact" className="hover:text-gold">Contact</Link>
        </nav>
        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" size="icon" aria-label="Cart">
            <Link href="/cart">
              <ShoppingBag className="h-5 w-5" />
              {mounted && count > 0 ? (
                <span className="ml-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-gold px-1 text-xs font-semibold text-charcoal">
                  {count}
                </span>
              ) : null}
            </Link>
          </Button>
          {signedIn ? (
            <Button asChild variant="outline" size="sm">
              <Link href="/account">
                <User className="mr-1 h-4 w-4" />
                {isAdmin ? "Admin" : "Account"}
              </Link>
            </Button>
          ) : (
            <Button asChild variant="outline" size="sm">
              <Link href="/sign-in">
                <User className="mr-1 h-4 w-4" />
                Sign in
              </Link>
            </Button>
          )}
        </div>
      </div>
      <div className="border-t border-border/40 bg-secondary/40 md:hidden">
        <nav className="mx-auto flex max-w-6xl items-center gap-3 overflow-x-auto px-4 py-2 text-xs">
          <Link href="/shop" className="hover:text-gold">Shop</Link>
          <Link href="/collections/niche" className="hover:text-gold">Niche</Link>
          <Link href="/collections/designer" className="hover:text-gold">Designer</Link>
          <Link href="/collections/middle-eastern" className="hover:text-gold">ME</Link>
          <Link href="/brands" className="hover:text-gold">Brands</Link>
          <Link href="/search" className="hover:text-gold">Search</Link>
          <Link href="/how-to-pay" className="hover:text-gold">How to pay</Link>
          <Link href="/contact" className="hover:text-gold">Contact</Link>
        </nav>
      </div>
      <span className="sr-only">{role}</span>
    </header>
  );
}
