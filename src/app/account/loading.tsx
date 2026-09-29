import Link from "next/link";
import { ArrowRight, MapPin, ShoppingBag, User, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Eyebrow, SectionCard, StatTile } from "@/components/ui/section";
import { cn } from "@/lib/utils";

const QUICK_LINKS = [
  { href: "/account/profile", label: "Profile", description: "Name, phone, sign-in methods", icon: User },
  { href: "/account/orders", label: "Orders", description: "Track receipts, confirmations, shipments", icon: ShoppingBag },
  { href: "/account/wishlist", label: "Wishlist", description: "Fragrances you saved for later", icon: Heart },
  { href: "/account/addresses", label: "Addresses", description: "Delivery and pickup locations", icon: MapPin },
];

// Spans, not <Skeleton> (a div): these sit inside the header's <h1>/<p>
// and the tiles' <p>, and inline-block keeps each line's real height.
const inlineSkeleton = "skeleton-shine inline-block rounded-md bg-muted align-middle";

export default function AccountLoading() {
  return (
    <div className="space-y-6">
      {/* PageHeader's markup, inline: its title prop only takes a string.
          The name, email, and the three counts are the only data here. The
          Admin badge is left out; it shows for admins only. */}
      <header className="flex flex-col gap-3 border-b border-border/60 pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <Eyebrow>Your account</Eyebrow>
          <h1 className="font-serif-display text-3xl leading-tight sm:text-4xl">
            Welcome back, <span className={cn(inlineSkeleton, "h-7 w-32 sm:h-8")} />
          </h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Signed in as <span className={cn(inlineSkeleton, "h-3.5 w-40")} />. Manage your profile, orders, and saved
            addresses.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button asChild variant="gold" className="rounded-md">
            <Link href="/shop">
              Continue shopping
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatTile label="Orders" value={<span className={cn(inlineSkeleton, "h-6 w-8")} />} hint="lifetime orders" />
        <StatTile label="Wishlist" value={<span className={cn(inlineSkeleton, "h-6 w-8")} />} hint="saved fragrances" />
        <StatTile label="Addresses" value={<span className={cn(inlineSkeleton, "h-6 w-8")} />} hint="on file" />
      </div>

      <SectionCard
        eyebrow="Quick actions"
        title="Where would you like to go?"
        contentClassName="grid grid-cols-1 gap-3 space-y-0 sm:grid-cols-2"
      >
        {QUICK_LINKS.map((link) => {
          const Icon = link.icon;
          return (
            <Link
              key={link.href}
              href={link.href}
              className="group flex h-full items-center gap-3 rounded-xl border border-border/60 bg-background p-4 transition-colors hover:border-gold/40 hover:bg-gold/5"
            >
              <div className="rounded-lg bg-gold/10 p-2 text-gold">
                <Icon className="h-4 w-4" />
              </div>
              <div className="flex-1 space-y-0.5">
                <p className="font-serif-display text-base leading-tight">{link.label}</p>
                <p className="text-xs text-muted-foreground">{link.description}</p>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" />
            </Link>
          );
        })}
      </SectionCard>
    </div>
  );
}
