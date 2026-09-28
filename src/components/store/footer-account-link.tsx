"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";

/** The footer's Maison column is otherwise static server-rendered markup —
 *  this one link is the only bit that depends on auth state, so only it
 *  needs to be a client component. Shares the same SessionProvider context
 *  StoreHeader reads from, including its pathname-triggered refetch (see
 *  StoreHeader's own comment), so this flips to "My account" immediately
 *  after sign-in too, not just on the next full page load. */
export function FooterAccountLink() {
  const { data: session, status } = useSession();
  const signedIn = status === "authenticated" && Boolean(session?.user);
  return signedIn ? (
    <Link href="/account" className="text-muted-foreground hover:text-foreground">
      My account
    </Link>
  ) : (
    <Link href="/sign-in" className="text-muted-foreground hover:text-foreground">
      Sign in
    </Link>
  );
}
