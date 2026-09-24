"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  Menu,
  Store,
  HelpCircle,
  MessageCircle,
  Wallet,
  FileText,
  Info,
  LogIn,
  UserCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
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
import { PromoMarquee } from "@/components/store/promo-marquee";

const PRIMARY_LINKS = [
  { href: "/shop", label: "Shop" },
  { href: "/faq", label: "FAQs" },
  { href: "/contact", label: "Contact" },
] as const;

const MENU_GROUPS = [
  {
    title: "Shop",
    links: [{ href: "/shop", label: "Shop", icon: Store }],
  },
  {
    title: "Help",
    links: [
      { href: "/faq", label: "FAQs", icon: HelpCircle },
      { href: "/contact", label: "Contact", icon: MessageCircle },
      { href: "/how-to-pay", label: "How to pay", icon: Wallet },
      { href: "/policies", label: "Policies", icon: FileText },
    ],
  },
  {
    title: "Maison",
    links: [{ href: "/about", label: "About", icon: Info }],
  },
] as const;

/** `announcement` comes from the root layout (a Server Component) because this
 *  header is a client component and cannot read the database itself. */
export function StoreHeader({ announcement = [] }: { announcement?: string[] }) {
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const signedIn = status === "authenticated" && Boolean(session?.user);
  const isAdmin = signedIn && (session?.user as { role?: string } | undefined)?.role === "ADMIN";
  // On /account and /admin, the mobile bottom nav's "More" sheet already
  // shows this exact same account/admin menu — showing this header icon too
  // was a confusing duplicate entry point. Desktop has no bottom nav, so it
  // stays the only way in there.
  const inAccountOrAdminSection = pathname?.startsWith("/account") || pathname?.startsWith("/admin");

  useEffect(() => {
    Promise.resolve().then(() => setMounted(true));
  }, []);

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur">
      {/* Matches the page-content container's cap (root layout, 2xl:80vw) so
          the logo/nav align with the content below instead of sitting flush
          against the edge of an ultra-wide screen while the page itself is
          inset. The promo marquee below stays full-bleed — it's a ticker,
          not page content, and its scroll math is sized to the viewport. */}
      <div className="relative flex h-14 w-full items-center justify-between gap-3 px-4 2xl:mx-auto 2xl:max-w-[80vw]">
        <div className="flex items-center gap-2">
          <MobileMenu signedIn={signedIn} />
          {/* Below 360px the wordmark has no room next to the logo mark and
              would wrap onto a second line inside this row's fixed h-14 —
              visually hidden from there down to just the mark instead.
              360 is the worst case: signed in, the right cluster is three
              44px icons (search, cart, account — 140px), and with the
              hamburger + mark + gaps the row needs ~356px; signed out it
              fits down to ~310px, but one cutoff for both keeps it uniform
              and avoids a hydration flash (the pre-mount placeholder is a
              third icon too). `whitespace-nowrap` so it can never stack
              even if the display font swaps in a hair wider — which rules
              out the `sr-only`/`not-sr-only` pair used before, since
              `not-sr-only` resets `white-space: normal`; the link carries
              an explicit `aria-label` instead so it keeps an accessible name
              while the text is `hidden` (the mark's alt stays "", decorative). */}
          <Link href="/" aria-label="Le Sillage Manila" className="flex items-center gap-2 font-serif-display text-lg">
            <Image src="/logo/mark.png" alt="" width={274} height={240} className="h-8 w-auto" priority />
            <span className="hidden min-[360px]:flex min-[360px]:flex-col min-[360px]:leading-none">
              <span className="whitespace-nowrap">Le Sillage</span>
              <span className="font-sans text-[10px] tracking-[0.32em] text-gold">Manila</span>
            </span>
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
          {/* Below 576px the shop grid is down to a single column (see
              catalog-grid.tsx) — that's the same "very small" cutoff this
              moves the toggle into the hamburger menu at, so the two track
              together off one breakpoint. */}
          <ThemeToggle className="hidden min-[576px]:inline-flex" />
          <SearchOverlay />
          <CartDrawer mounted={mounted} />
          {!mounted || status === "loading" ? (
            <span className="inline-block h-11 w-11" aria-hidden="true" />
          ) : signedIn ? (
            <span className={inAccountOrAdminSection ? "hidden md:inline-flex" : undefined}>
              <AccountPreview
                signedIn
                isAdmin={Boolean(isAdmin)}
                name={session?.user?.name}
                email={session?.user?.email}
              />
            </span>
          ) : (
            <Button asChild variant="ghost" size="sm" className="hidden min-h-11 rounded-md md:inline-flex">
              <Link href="/sign-in">Sign in</Link>
            </Button>
          )}
        </div>
      </div>
      {/* Part of the navbar, under the nav row — so it stays put with the
          sticky header instead of scrolling away with the page. */}
      <PromoMarquee messages={announcement} />
    </header>
  );
}

function MobileMenu({ signedIn }: { signedIn: boolean }) {
  const pathname = usePathname();
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon-lg" aria-label="Open menu" className="min-h-11 min-w-11 md:hidden">
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-full data-[side=left]:w-full sm:w-72">
        <SheetHeader className="border-b border-border/60">
          <SheetTitle aria-label="Le Sillage Manila" className="flex items-center gap-2 font-serif-display">
            <Image src="/logo/mark.png" alt="" width={274} height={240} className="h-6 w-auto" />
            <span className="flex flex-col leading-none">
              <span>Le Sillage</span>
              <span className="font-sans text-[10px] tracking-[0.32em] text-gold">Manila</span>
            </span>
          </SheetTitle>
        </SheetHeader>
        <nav className="flex flex-col gap-5 overflow-y-auto px-4 pb-4">
          {/* Only below 576px — from there up, the header's own icon button
              (hidden min-[576px]:inline-flex above) already covers this, and
              showing both would be a confusing duplicate control. */}
          <div className="space-y-1.5 min-[576px]:hidden">
            <p className="px-3 text-[10px] uppercase tracking-[0.3em] text-gold">Preferences</p>
            <ThemeToggle showLabel />
          </div>
          {MENU_GROUPS.map((group) => (
            <div key={group.title} className="space-y-1.5">
              <p className="px-3 text-[10px] uppercase tracking-[0.3em] text-gold">{group.title}</p>
              <ul className="space-y-0.5">
                {group.links.map((link) => {
                  const Icon = link.icon;
                  const active = pathname === link.href || pathname?.startsWith(link.href + "/");
                  return (
                    <li key={link.href}>
                      <SheetClose asChild>
                        <Link
                          href={link.href}
                          className={cn(
                            "flex min-h-11 items-center gap-3 rounded-md px-3 text-sm transition-colors",
                            active
                              ? "bg-gold/15 font-medium text-foreground"
                              : "text-muted-foreground hover:bg-muted hover:text-foreground",
                          )}
                        >
                          <Icon className="h-4 w-4" />
                          {link.label}
                        </Link>
                      </SheetClose>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
          <div className="border-t border-border/60 pt-4">
            <SheetClose asChild>
              <Link
                href={signedIn ? "/account" : "/sign-in"}
                className="flex min-h-11 items-center justify-center gap-2 rounded-md bg-gold px-3 text-sm font-medium text-gold-foreground transition-colors hover:bg-gold/90"
              >
                {signedIn ? <UserCircle className="h-4 w-4" /> : <LogIn className="h-4 w-4" />}
                {signedIn ? "My account" : "Sign in"}
              </Link>
            </SheetClose>
          </div>
        </nav>
      </SheetContent>
    </Sheet>
  );
}
