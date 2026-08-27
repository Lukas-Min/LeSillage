"use client";

import Link from "next/link";
import { User } from "lucide-react";
import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

const SIGNED_IN_LINKS = [
  { href: "/account", label: "Account home" },
  { href: "/account/orders", label: "Orders" },
  { href: "/account/wishlist", label: "Wishlist" },
  { href: "/account/addresses", label: "Addresses" },
] as const;

export function AccountPreview({
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
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon-lg" aria-label="Account" className="min-h-11 min-w-11">
          <User className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:max-w-sm">
        <SheetHeader>
          <SheetTitle className="font-serif-display text-2xl">
            {signedIn ? (name ?? "Your account") : "Welcome"}
          </SheetTitle>
        </SheetHeader>
        {signedIn ? (
          <div className="flex flex-col gap-4 px-4 pb-6">
            {email ? <p className="text-sm text-muted-foreground">{email}</p> : null}
            <nav className="flex flex-col gap-1">
              {SIGNED_IN_LINKS.map((link) => (
                <SheetClose asChild key={link.href}>
                  <Link
                    href={link.href}
                    className="flex min-h-11 items-center rounded-md px-3 text-sm hover:bg-muted"
                  >
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
            </nav>
            <SheetClose asChild>
              <Button asChild variant="gold" className="rounded-md">
                <Link href="/shop">Continue shopping</Link>
              </Button>
            </SheetClose>
            <Button variant="outline" className="rounded-md" onClick={() => signOut({ callbackUrl: "/" })}>
              Sign out
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-3 px-4 pb-6">
            <p className="text-sm text-muted-foreground">
              Sign in to track orders, save a wishlist, and check out faster.
            </p>
            <SheetClose asChild>
              <Button asChild variant="gold" className="rounded-md">
                <Link href="/sign-in">Sign in</Link>
              </Button>
            </SheetClose>
            <SheetClose asChild>
              <Button asChild variant="outline" className="rounded-md">
                <Link href="/sign-up">Create an account</Link>
              </Button>
            </SheetClose>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
