import { redirect } from "next/navigation";
import Link from "next/link";
import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db/client";
import { addresses, users } from "@/db/schema";
import { loadCartView, resolveActiveCart } from "@/lib/cart";
import { CheckoutForm } from "@/components/store/checkout-form";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function CheckoutPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/sign-in?returnTo=/checkout");
  }
  const { cart } = await resolveActiveCart();
  const userRows = await db()
    .select({ phone: users.phone, defaultAddressId: users.defaultAddressId, name: users.name })
    .from(users)
    .where(eq(users.id, session.user.id));
  const [deliveryView, pickupView, savedAddresses] = await Promise.all([
    loadCartView(cart.id, "DELIVERY"),
    loadCartView(cart.id, "PICKUP"),
    db().select().from(addresses).where(eq(addresses.userId, session.user.id)),
  ]);
  const userRow = userRows[0];
  if (deliveryView.items.length === 0) {
    return (
      <main className="mx-auto w-full max-w-3xl px-4 py-8">
        <h1 className="font-serif-display text-2xl">Checkout</h1>
        <p className="mt-4 text-muted-foreground">Your cart is empty.</p>
        <Button asChild className="mt-4">
          <Link href="/bottles">Browse the catalog</Link>
        </Button>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8">
      <h1 className="font-serif-display text-2xl">Checkout</h1>
      <p className="text-sm text-muted-foreground">
        All amounts in Philippine pesos (₱). Delivery default ₱120, pickup free. Free delivery unlocks at ₱2,000 of discounted decants.
      </p>
      <CheckoutForm
        defaultName={userRow?.name ?? session.user.name ?? ""}
        defaultEmail={session.user.email ?? ""}
        preloadedPhone={userRow?.phone ?? ""}
        lineItems={deliveryView.items}
        deliveryTotals={deliveryView.totals}
        pickupTotals={pickupView.totals}
        addresses={savedAddresses}
        defaultAddressId={userRow?.defaultAddressId ?? savedAddresses.find((a) => a.isDefault)?.id ?? null}
      />
    </main>
  );
}
