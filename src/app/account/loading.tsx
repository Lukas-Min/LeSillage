import Link from "next/link";
import { ArrowRight, MapPin, ShoppingBag, User, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SectionCard } from "@/components/ui/section";
import { AreaHeader, MiniStat, MiniStats, PAGE_ACTION_CLASS, PageColumns } from "@/components/ui/page-layout";
import { cn } from "@/lib/utils";

const QUICK_LINKS = [
  { href: "/account/profile", label: "Profile", description: "Name, phone, sign-in methods", icon: User },
  { href: "/account/orders", label: "Orders", description: "Track receipts, confirmations, shipments", icon: ShoppingBag },
  { href: "/account/wishlist", label: "Wishlist", description: "Fragrances you saved for later", icon: Heart },
  { href: "/account/addresses", label: "Addresses", description: "Delivery and pickup locations", icon: MapPin },
];

// Spans, not <Skeleton> (a div): these sit inside the header's <h1> and the
// tiles' <dd>, and inline-block keeps each line's real height.
const inlineSkeleton = "skeleton-shine inline-block rounded-md bg-muted align-middle";

export default function AccountLoading() {
  return (
    <div className="space-y-6">
      {/* The name, email, and the three counts are the only data here. The
          Admin badge is left out; it shows for admins only. */}
      <AreaHeader
        eyebrow="Your account"
        title={
          <>
            Welcome back, <span className={cn(inlineSkeleton, "h-6 w-32 sm:h-7")} />
          </>
        }
        subtitle={
          <>
            Signed in as <span className={cn(inlineSkeleton, "h-3.5 w-40")} />. Manage your profile, orders, and saved
            addresses.
          </>
        }
        actions={
          <Button asChild variant="gold" className={PAGE_ACTION_CLASS}>
            <Link href="/shop">
              Continue shopping
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        }
      />

      <PageColumns
        side={
          <SectionCard title="Summary">
            <MiniStats>
              <MiniStat label="Orders" value={<span className={cn(inlineSkeleton, "h-6 w-8")} />} hint="lifetime orders" />
              <MiniStat
                label="Wishlist"
                value={<span className={cn(inlineSkeleton, "h-6 w-8")} />}
                hint="saved fragrances"
              />
              <MiniStat
                label="Addresses"
                value={<span className={cn(inlineSkeleton, "h-6 w-8")} />}
                hint="on file"
                className="col-span-2"
              />
            </MiniStats>
          </SectionCard>
        }
        main={
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
        }
      />
    </div>
  );
}
