import Link from "next/link";
import { ArrowRight, MapPin, ShoppingBag, User, Heart } from "lucide-react";
import { eq, sql } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db/client";
import { orders, wishlists, addresses } from "@/db/schema";
import { SectionCard } from "@/components/ui/section";
import { AreaHeader, MiniStat, MiniStats, PAGE_ACTION_CLASS, PageColumns } from "@/components/ui/page-layout";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

const QUICK_LINKS = [
  {
    href: "/account/profile",
    label: "Profile",
    description: "Name, phone, sign-in methods",
    icon: User,
  },
  {
    href: "/account/orders",
    label: "Orders",
    description: "Track receipts, confirmations, shipments",
    icon: ShoppingBag,
  },
  {
    href: "/account/wishlist",
    label: "Wishlist",
    description: "Fragrances you saved for later",
    icon: Heart,
  },
  {
    href: "/account/addresses",
    label: "Addresses",
    description: "Delivery and pickup locations",
    icon: MapPin,
  },
];

export default async function AccountPage() {
  const session = await auth();
  if (!session?.user) return null;
  const client = db();
  const [orderCountRow, wishlistCountRow, addressCountRow] = await Promise.all([
    client
      .select({ value: sql<number>`count(*)::int` })
      .from(orders)
      .where(eq(orders.userId, session.user.id as string)),
    client
      .select({ value: sql<number>`count(*)::int` })
      .from(wishlists)
      .where(eq(wishlists.userId, session.user.id as string)),
    client
      .select({ value: sql<number>`count(*)::int` })
      .from(addresses)
      .where(eq(addresses.userId, session.user.id as string)),
  ]);
  const orderCount = Number(orderCountRow[0]?.value ?? 0);
  const wishlistCount = Number(wishlistCountRow[0]?.value ?? 0);
  const addressCount = Number(addressCountRow[0]?.value ?? 0);
  const name = session.user.name ?? "there";
  const role = (session.user as { role?: string }).role === "ADMIN" ? "Admin" : null;
  return (
    <div className="space-y-6">
      <AreaHeader
        eyebrow="Your account"
        title={`Welcome back, ${name}`}
        badge={
          role ? (
            <span className="rounded-none border border-gold/40 bg-gold/10 px-2.5 py-1 text-xs font-medium text-gold-ink">
              {role}
            </span>
          ) : null
        }
        subtitle={`Signed in as ${session.user.email}. Manage your profile, orders, and saved addresses.`}
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
              <MiniStat label="Orders" value={orderCount} hint="lifetime orders" />
              <MiniStat label="Wishlist" value={wishlistCount} hint="saved fragrances" />
              <MiniStat label="Addresses" value={addressCount} hint="on file" className="col-span-2" />
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
