"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Menu, Search, ShoppingBag, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCartCount } from "@/components/store/cart-context";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

const PRIMARY_LINKS = [
  { href: "/shop", label: "Shop" },
  { href: "/how-to-pay", label: "How to pay" },
] as const;

const ACCOUNT_LINKS = [
  { href: "/account", label: "Account home" },
  { href: "/account/profile", label: "Profile" },
  { href: "/account/orders", label: "Orders" },
  { href: "/account/wishlist", label: "Wishlist" },
  { href: "/account/addresses", label: "Addresses" },
] as const;

const MENU_LINKS = [
  { href: "/shop", label: "Shop" },
  { href: "/shop?type=DECANT", label: "Decants" },
  { href: "/shop?type=FULL_BOTTLE", label: "Full bottles" },
  { href: "/shop?type=PARTIAL", label: "Partials" },
  { href: "/how-to-pay", label: "How to pay" },
  { href: "/search", label: "Search" },
  { href: "/about", label: "About" },
  { href: "/faq", label: "FAQ" },
  { href: "/contact", label: "Contact" },
  { href: "/policies", label: "Policies" },
] as const;

export function StoreHeader({
  signedIn,
  isAdmin,
}: {
  signedIn: boolean;
  isAdmin: boolean;
}) {
  const count = useCartCount();
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();
  useEffect(() => {
    Promise.resolve().then(() => setMounted(true));
  }, []);

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4">
        <div className="flex items-center gap-2">
          <MobileMenu signedIn={signedIn} isAdmin={isAdmin} />
          <Link href="/" className="flex items-center gap-2 font-serif-display text-lg">
            <span className="inline-block h-2 w-2 rounded-full bg-gold" />
            Le Sillage
          </Link>
        </div>
        <nav className="hidden items-center gap-6 text-sm md:flex">
          {PRIMARY_LINKS.map((link) => {
            const active = pathname === link.href || pathname?.startsWith(link.href + "/");
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "relative inline-flex min-h-11 items-center transition-colors hover:text-gold",
                  active ? "text-foreground" : "text-muted-foreground",
                )}
              >
                {link.label}
                {active ? (
                  <span className="absolute inset-x-0 -bottom-px h-px bg-gold" />
                ) : null}
              </Link>
            );
          })}
        </nav>
        <div className="flex items-center gap-1">
          <Button asChild variant="ghost" size="icon-lg" aria-label="Search" className="min-h-11 min-w-11">
            <Link href="/search">
              <Search className="h-5 w-5" />
            </Link>
          </Button>
          <Button asChild variant="ghost" size="icon-lg" aria-label="Cart" className="relative min-h-11 min-w-11">
            <Link href="/cart">
              <ShoppingBag className="h-5 w-5" />
              {mounted && count > 0 ? (
                <span className="absolute top-1 right-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-gold px-1 text-[10px] font-semibold text-charcoal">
                  {count}
                </span>
              ) : null}
            </Link>
          </Button>
          {signedIn ? <AccountMenu isAdmin={isAdmin} /> : (
            <Button asChild variant="ghost" size="icon-lg" aria-label="Sign in" className="min-h-11 min-w-11">
              <Link href="/sign-in">
                <User className="h-5 w-5" />
              </Link>
            </Button>
          )}
          {isAdmin ? (
            <Button asChild variant="outline" size="sm" className="hidden min-h-11 md:inline-flex">
              <Link href="/admin">Admin</Link>
            </Button>
          ) : null}
        </div>
      </div>
    </header>
  );
}

function AccountMenu({ isAdmin }: { isAdmin: boolean }) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon-lg" aria-label="Account" className="min-h-11 min-w-11">
          <User className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-72">
        <SheetHeader>
          <SheetTitle className="font-serif-display">Your account</SheetTitle>
        </SheetHeader>
        <nav className="flex flex-col gap-1 px-2 pt-2">
          {ACCOUNT_LINKS.map((link) => (
            <SheetClose asChild key={link.href}>
              <Link
                href={link.href}
                className="flex min-h-11 items-center rounded-lg px-3 text-sm hover:bg-muted"
              >
                {link.label}
              </Link>
            </SheetClose>
          ))}
          {isAdmin ? (
            <SheetClose asChild>
              <Link href="/admin" className="flex min-h-11 items-center rounded-lg px-3 text-sm hover:bg-muted">
                Admin
              </Link>
            </SheetClose>
          ) : null}
        </nav>
      </SheetContent>
    </Sheet>
  );
}

function MobileMenu({ signedIn, isAdmin }: { signedIn: boolean; isAdmin: boolean }) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon-lg" aria-label="Open menu" className="min-h-11 min-w-11 md:hidden">
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-72">
        <SheetHeader>
          <SheetTitle className="font-serif-display">Le Sillage</SheetTitle>
        </SheetHeader>
        <nav className="flex flex-col gap-1 px-2">
          {MENU_LINKS.map((link) => (
            <SheetClose asChild key={link.href}>
              <Link
                href={link.href}
                className="flex min-h-11 items-center rounded-lg px-3 text-sm hover:bg-muted"
              >
                {link.label}
              </Link>
            </SheetClose>
          ))}
          {isAdmin ? (
            <SheetClose asChild>
              <Link href="/admin" className="flex min-h-11 items-center rounded-lg px-3 text-sm hover:bg-muted">
                Admin
              </Link>
            </SheetClose>
          ) : null}
          <SheetClose asChild>
            <Link
              href={signedIn ? "/account" : "/sign-in"}
              className="flex min-h-11 items-center rounded-lg px-3 text-sm hover:bg-muted"
            >
              {signedIn ? "Account" : "Sign in"}
            </Link>
          </SheetClose>
        </nav>
      </SheetContent>
    </Sheet>
  );
}