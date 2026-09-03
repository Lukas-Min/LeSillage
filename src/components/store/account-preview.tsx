"use client";

import Link from "next/link";
import { User } from "lucide-react";
import { SidebarContent } from "@/components/store/account-nav";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

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
      <SheetContent side="right" className="flex w-full flex-col sm:max-w-sm">
        <SheetHeader>
          <SheetTitle className="font-serif-display text-2xl">
            {signedIn ? (name ?? "Your account") : "Welcome"}
          </SheetTitle>
        </SheetHeader>
        {signedIn ? (
          <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-4 pb-6">
            {email ? <p className="text-sm text-muted-foreground">{email}</p> : null}
            <SidebarContent isAdmin={isAdmin} />
            <SheetClose asChild>
              <Button asChild variant="gold" className="h-11 w-full rounded-md">
                <Link href="/shop">Continue shopping</Link>
              </Button>
            </SheetClose>
          </div>
        ) : (
          <div className="flex flex-col gap-3 px-4 pb-6">
            <p className="text-sm text-muted-foreground">
              Sign in to track orders, save a wishlist, and check out faster.
            </p>
            <SheetClose asChild>
              <Button asChild variant="gold" className="h-11 w-full rounded-md">
                <Link href="/sign-in">Sign in</Link>
              </Button>
            </SheetClose>
            <SheetClose asChild>
              <Button asChild variant="outline" className="h-11 w-full rounded-md">
                <Link href="/sign-up">Create an account</Link>
              </Button>
            </SheetClose>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
