import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { eq, inArray } from "drizzle-orm";
import { db } from "@/db/client";
import { carts, cartItems, skus, products, productDiscounts, promoSettings } from "@/db/schema";
import { priceCart } from "@/domain/cart";
import { CheckoutForm } from "@/components/store/checkout-form";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function CheckoutPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/sign-in?returnTo=/checkout");
  }
  const client = db();
  const userCart = (await client.select().from(carts).where(eq(carts.userId, session.user.id as string)))[0];
  const items = userCart
    ? await client.select().from(cartItems).where(eq(cartItems.cartId, userCart.id))
    : [];
  if (items.length === 0) {
    return (
      <main className="mx-auto w-full max-w-3xl px-4 py-8">
        <h1 className="font-serif-display text-2xl">Checkout</h1>
        <p className="mt-4 text-muted-foreground">Your cart is empty.</p>
        <Button asChild className="mt-4">
          <Link href="/shop">Browse the catalog</Link>
        </Button>
      </main>
    );
  }
  const skuRows = await client
    .select({
      sku: skus,
      productType: products.type,
      productBrand: products.brand,
      productFamily: products.family,
      productId: products.id,
    })
    .from(skus)
    .innerJoin(products, eq(products.id, skus.productId))
    .where(inArray(skus.id, items.map((i) => i.skuId)));
  const promoRow = (await client.select().from(promoSettings).where(eq(promoSettings.id, "singleton")))[0];
  const discounts = await client.select().from(productDiscounts);

  const totals = priceCart(
    items.map((item) => {
      const row = skuRows.find((s) => s.sku.id === item.skuId);
      if (!row) throw new Error("Cart item missing");
      return {
        sku: row.sku,
        quantity: item.quantity,
        productType: row.productType,
        productBrand: row.productBrand,
        productFamily: row.productFamily,
        discounts: discounts.filter((d) => d.productId === row.productId),
      };
    }),
    {
      deliveryFeeCentavos: promoRow?.deliveryFeeCentavos ?? 12000,
      freeShipping: false,
    },
  );

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8">
      <h1 className="font-serif-display text-2xl">Checkout</h1>
      <p className="text-sm text-muted-foreground">
        All amounts in Philippine pesos (₱). Delivery default ₱120, pickup free.
      </p>
      <CheckoutForm
        defaultName={session.user.name ?? ""}
        defaultEmail={session.user.email ?? ""}
        totals={{
          merchandiseSubtotalCentavos: totals.merchandiseSubtotalCentavos,
          discountCentavos: totals.discountCentavos,
          deliveryFeeCentavos: totals.deliveryFeeCentavos,
          totalCentavos: totals.totalCentavos,
          freeShipping: totals.deliveryFeeCentavos === 0,
        }}
      />
    </main>
  );
}