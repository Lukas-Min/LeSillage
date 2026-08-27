"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AccountPreview } from "@/components/store/account-preview";
import { CartDrawer } from "@/components/store/cart-drawer";
import { SearchOverlay } from "@/components/store/search-overlay";
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
  { href: "/shop?type=DECANT", label: "Decants" },
  { href: "/brands", label: "Brands" },
  { href: "/how-to-pay", label: "How to pay" },
] as const;

const MENU_LINKS = [
  { href: "/shop", label: "Shop" },
  { href: "/shop?type=DECANT", label: "Decants" },
  { href: "/brands", label: "Brands" },
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
  name,
  email,
}: {
  signedIn: boolean;
  isAdmin: boolean;
  name?: string | null;
  email?: string | null;
}) {
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeType = searchParams.get("type");
  useEffect(() => {
    Promise.resolve().then(() => setMounted(true));
  }, []);

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4">
        <div className="flex items-center gap-2">
          <MobileMenu signedIn={signedIn} isAdmin={isAdmin} />
          <Link href="/" className="font-serif-display text-lg">
            Le Sillage
          </Link>
        </div>
        <nav className="hidden items-center gap-7 text-xs uppercase tracking-[0.22em] md:flex">
          {PRIMARY_LINKS.map((link) => {
            const [linkPath, linkQuery] = link.href.split("?");
            const linkType = new URLSearchParams(linkQuery).get("type");
            const active = pathname === linkPath && activeType === linkType;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "relative inline-flex min-h-11 items-center transition-colors hover:text-foreground",
                  active ? "text-foreground" : "text-muted-foreground",
                )}
              >
                {link.label}
                {active ? <span className="absolute inset-x-0 -bottom-px h-px bg-gold" /> : null}
              </Link>
            );
          })}
        </nav>
        <div className="flex items-center gap-1">
          <SearchOverlay />
          <CartDrawer mounted={mounted} />
          <AccountPreview signedIn={signedIn} isAdmin={isAdmin} name={name} email={email} />
          {isAdmin ? (
            <Button asChild variant="outline" size="sm" className="hidden min-h-11 rounded-md md:inline-flex">
              <Link href="/admin">Admin</Link>
            </Button>
          ) : null}
        </div>
      </div>
    </header>
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
              <Link href={link.href} className="flex min-h-11 items-center rounded-md px-3 text-sm hover:bg-muted">
                {link.label}
              </Link>
            </SheetClose>
          ))}
          {isAdmin ? (
            <SheetClose asChild>
              <Link href="/admin" className="flex min-h-11 items-center rounded-md px-3 text-sm hover:bg-muted">
                Admin
              </Link>
            </SheetClose>
          ) : null}
          <SheetClose asChild>
            <Link
              href={signedIn ? "/account" : "/sign-in"}
              className="flex min-h-11 items-center rounded-md px-3 text-sm hover:bg-muted"
            >
              {signedIn ? "Account" : "Sign in"}
            </Link>
          </SheetClose>
        </nav>
      </SheetContent>
    </Sheet>
  );
}
