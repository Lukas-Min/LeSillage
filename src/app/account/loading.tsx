import Link from "next/link";
import { ArrowRight, MapPin, ShoppingBag, User, Heart } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { SectionCard } from "@/components/ui/section";

const QUICK_LINKS = [
  { href: "/account/profile", label: "Profile", description: "Name, phone, sign-in methods", icon: User },
  { href: "/account/orders", label: "Orders", description: "Track receipts, confirmations, shipments", icon: ShoppingBag },
  { href: "/account/wishlist", label: "Wishlist", description: "Fragrances you saved for later", icon: Heart },
  { href: "/account/addresses", label: "Addresses", description: "Delivery and pickup locations", icon: MapPin },
];

export default function AccountLoading() {
  return (
    <div className="space-y-6">
      {/* Greeting/email and order/wishlist/address counts are all
          session/DB-dependent — the only real skeletons on this page. */}
      <div className="space-y-2">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-8 w-1/2" />
        <Skeleton className="h-4 w-2/3" />
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full rounded-2xl" />
        ))}
      </div>
      <SectionCard
        eyebrow="Quick actions"
        title="Where would you like to go?"
        contentClassName="grid grid-cols-1 gap-3 sm:grid-cols-2"
      >
        {QUICK_LINKS.map((link) => {
          const Icon = link.icon;
          return (
            <Link
              key={link.href}
              href={link.href}
              className="group flex items-start gap-3 rounded-xl border border-border/60 bg-background p-4 transition-colors hover:border-gold/40 hover:bg-gold/5"
            >
              <div className="rounded-lg bg-gold/10 p-2 text-gold-foreground">
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
