"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
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
  { href: "/faq", label: "FAQs" },
  { href: "/contact", label: "Contact" },
] as const;

const MENU_LINKS = [
  { href: "/shop", label: "Shop" },
  { href: "/faq", label: "FAQs" },
  { href: "/contact", label: "Contact" },
  { href: "/how-to-pay", label: "How to pay" },
  { href: "/about", label: "About" },
  { href: "/policies", label: "Policies" },
] as const;

export function StoreHeader() {
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const signedIn = status === "authenticated" && Boolean(session?.user);
  const isAdmin = signedIn && (session?.user as { role?: string } | undefined)?.role === "ADMIN";

  useEffect(() => {
    Promise.resolve().then(() => setMounted(true));
  }, []);

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur">
      <div className="relative mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4">
        <div className="flex items-center gap-2">
          <MobileMenu signedIn={signedIn} />
          <Link href="/" className="flex items-center gap-2 font-serif-display text-lg">
            <Image src="/logo/mark.png" alt="" width={274} height={240} className="h-8 w-auto" priority />
            Le Sillage
          </Link>
        </div>
        <nav className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-8 text-xs uppercase tracking-[0.22em] md:flex">
          {PRIMARY_LINKS.map((link) => {
            const active = pathname === link.href || pathname?.startsWith(link.href + "/");
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
          {!mounted || status === "loading" ? (
            <span className="inline-block h-11 w-11" aria-hidden="true" />
          ) : signedIn ? (
            <AccountPreview
              signedIn
              isAdmin={Boolean(isAdmin)}
              name={session?.user?.name}
              email={session?.user?.email}
            />
          ) : (
            <Button asChild variant="ghost" size="sm" className="hidden min-h-11 rounded-md md:inline-flex">
              <Link href="/sign-in">Sign in</Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}

function MobileMenu({ signedIn }: { signedIn: boolean }) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon-lg" aria-label="Open menu" className="min-h-11 min-w-11 md:hidden">
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-72">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2 font-serif-display">
            <Image src="/logo/mark.png" alt="" width={274} height={240} className="h-6 w-auto" />
            Le Sillage
          </SheetTitle>
        </SheetHeader>
        <nav className="flex flex-col gap-1 px-2">
          {MENU_LINKS.map((link) => (
            <SheetClose asChild key={link.href}>
              <Link href={link.href} className="flex min-h-11 items-center rounded-md px-3 text-sm hover:bg-muted">
                {link.label}
              </Link>
            </SheetClose>
          ))}
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
