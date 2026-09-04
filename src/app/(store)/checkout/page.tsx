import { redirect } from "next/navigation";
import Link from "next/link";
import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db/client";
import { addresses, users } from "@/db/schema";
import { loadCartViewForBothMethods, loadDirectItemViewForBothMethods, resolveActiveCart } from "@/lib/cart";
import { fetchProvinceOptions } from "@/lib/ph-locations";
import { CheckoutForm } from "@/components/store/checkout-form";
import { Button } from "@/components/ui/button";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";

export const dynamic = "force-dynamic";
// The actions posted to this route send email inside after(); that work
// counts against the invocation's time budget, so leave room for the SMTP
// timeouts (8s each) instead of the 10s default.
export const maxDuration = 30;

export default async function CheckoutPage({
  searchParams,
}: {
  searchParams: Promise<{ buyNow?: string }>;
}) {
  // Buy Now: "?buyNow=<skuId>:<quantity>" prices exactly that item with no
  // cart involved at all — resolveActiveCart/loadCartViewForBothMethods are
  // skipped entirely, so the cart is never read here.
  const { buyNow } = await searchParams;
  const [rawSkuId, rawQuantity] = buyNow?.split(":") ?? [];
  const directItem =
    rawSkuId && Number.isFinite(Number(rawQuantity)) && Number(rawQuantity) >= 1
      ? { skuId: rawSkuId, quantity: Math.floor(Number(rawQuantity)) }
      : null;
  // A `buyNow` param that fails to parse (truncated/hand-edited/a future
  // producer that forgets the quantity segment) must not silently fall
  // through to checking out the customer's unrelated cart below — that
  // would charge them for the wrong items with no indication anything
  // was wrong. Only a fully absent param means "this is a cart checkout".
  const buyNowMalformed = Boolean(buyNow) && !directItem;

  const session = await auth();
  if (!session?.user) {
    // Preserve the buyNow target across sign-in so it isn't silently
    // dropped in favor of an empty-cart checkout after the redirect back.
    const returnTo = directItem ? `/checkout?buyNow=${encodeURIComponent(buyNow!)}` : "/checkout";
    redirect(`/sign-in?returnTo=${encodeURIComponent(returnTo)}`);
  }

  if (buyNowMalformed) {
    return (
      <main className="mx-auto w-full max-w-3xl px-4 py-8">
        <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Cart", href: "/cart" }, { label: "Checkout" }]} />
        <h1 className="font-serif-display text-2xl">Checkout</h1>
        <p className="mt-4 text-muted-foreground">This item is no longer available.</p>
        <Button asChild variant="gold" className="mt-4 rounded-md">
          <Link href="/shop">Browse the shop</Link>
        </Button>
      </main>
    );
  }

  const userRows = await db()
    .select({ phone: users.phone, defaultAddressId: users.defaultAddressId, name: users.name })
    .from(users)
    .where(eq(users.id, session.user.id));
  const userRow = userRows[0];

  const [cartView, savedAddresses, provinces] = await Promise.all([
    directItem
      ? loadDirectItemViewForBothMethods(directItem.skuId, directItem.quantity)
      : resolveActiveCart().then(({ cart }) => loadCartViewForBothMethods(cart.id)),
    db().select().from(addresses).where(eq(addresses.userId, session.user.id)),
    fetchProvinceOptions(),
  ]);
  // Deactivated-SKU lines ride along in `items` (see loadCartView) so the
  // drawer/cart page can show a "no longer available" notice — but they must
  // not count as real, purchasable items here or reach the order form.
  const purchasableItems = cartView.items.filter((item) => item.available);
  if (purchasableItems.length === 0) {
    return (
      <main className="mx-auto w-full max-w-3xl px-4 py-8">
        <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Cart", href: "/cart" }, { label: "Checkout" }]} />
        <h1 className="font-serif-display text-2xl">Checkout</h1>
        <p className="mt-4 text-muted-foreground">
          {directItem ? "This item is no longer available." : "Your cart is empty."}
        </p>
        <Button asChild variant="gold" className="mt-4 rounded-md">
          <Link href="/shop">Browse the shop</Link>
        </Button>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8">
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Cart", href: "/cart" }, { label: "Checkout" }]} />
      <h1 className="font-serif-display text-2xl">Checkout</h1>
      <p className="text-sm text-muted-foreground">All amounts shown are in Philippine pesos (₱).</p>
      <CheckoutForm
        defaultName={userRow?.name ?? session.user.name ?? ""}
        defaultEmail={session.user.email ?? ""}
        preloadedPhone={userRow?.phone ?? ""}
        lineItems={purchasableItems}
        deliveryTotals={cartView.deliveryTotals}
        pickupTotals={cartView.pickupTotals}
        addresses={savedAddresses}
        defaultAddressId={userRow?.defaultAddressId ?? savedAddresses.find((a) => a.isDefault)?.id ?? null}
        provinces={provinces}
        directItem={directItem ?? undefined}
      />
    </main>
  );
}
