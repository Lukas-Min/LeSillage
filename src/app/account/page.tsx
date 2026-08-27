import Link from "next/link";
import { ArrowRight, MapPin, ShoppingBag, User, Heart } from "lucide-react";
import { eq, sql } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db/client";
import { orders, wishlists, addresses } from "@/db/schema";
import { PageHeader, SectionCard, StatTile } from "@/components/ui/section";
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
      <PageHeader
        eyebrow="Your account"
        title={`Welcome back, ${name}`}
        subtitle={`Signed in as ${session.user.email}. Manage your profile, orders, and saved addresses.`}
        actions={
          <>
            {role ? (
              <span className="rounded-none border border-gold/40 bg-gold/10 px-2.5 py-1 text-xs font-medium text-gold-foreground">
                {role}
              </span>
            ) : null}
            <Button asChild variant="gold" className="rounded-md">
              <Link href="/shop">
                Continue shopping
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatTile label="Orders" value={orderCount} hint="lifetime orders" />
        <StatTile label="Wishlist" value={wishlistCount} hint="saved fragrances" />
        <StatTile label="Addresses" value={addressCount} hint="on file" />
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