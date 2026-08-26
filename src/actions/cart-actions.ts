"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { cartItems, products, skus } from "@/db/schema";
import { rateLimit, getRequestKey } from "@/lib/rate-limit";
import {
  addOneToCart,
  importLegacyCartLines,
  loadCartView,
  loadPromoConfig,
  mergeGuestCartIntoUser as mergeGuest,
  resolveActiveCart,
  type CartView,
} from "@/lib/cart";

export async function getCart(): Promise<CartView> {
  const { cart } = await resolveActiveCart();
  return loadCartView(cart.id);
}

export async function addItemToCart(skuId: string, requestedQuantity: number): Promise<CartView> {
  const { cart, subject } = await resolveActiveCart();
  const decision = await rateLimit({
    bucket: "CHECKOUT",
    key: await getRequestKey("cart-add", subject),
    limit: 60,
    windowMs: 60_000,
  });
  if (!decision.allowed) throw new Error("Too many requests. Please slow down.");
  const promoConfig = await loadPromoConfig();
  const found = (
    await db()
      .select({ sku: skus, productType: products.type, remainingMl: products.remainingMl })
      .from(skus)
      .innerJoin(products, eq(products.id, skus.productId))
      .where(eq(skus.id, skuId))
  )[0];
  if (!found || !found.sku.isActive || found.sku.isTester) throw new Error("That item is unavailable");
  await addOneToCart(
    cart,
    { ...found.sku, productType: found.productType, remainingMl: found.remainingMl },
    requestedQuantity,
    promoConfig.decantPreOrderThresholdMl,
  );
  revalidatePath("/", "layout");
  return loadCartView(cart.id);
}

export async function updateCartItem(skuId: string, quantity: number): Promise<CartView> {
  const { cart } = await resolveActiveCart();
  if (quantity <= 0) {
    await db()
      .delete(cartItems)
      .where(and(eq(cartItems.cartId, cart.id), eq(cartItems.skuId, skuId)));
    revalidatePath("/", "layout");
    return loadCartView(cart.id);
  }
  const found = (
    await db()
      .select({ sku: skus, productType: products.type })
      .from(skus)
      .innerJoin(products, eq(products.id, skus.productId))
      .where(eq(skus.id, skuId))
  )[0];
  if (!found) throw new Error("Item not found");
  const cap = found.productType === "DECANT" || found.sku.fulfillment === "PRE_ORDER" ? 99 : found.sku.stock;
  await db()
    .update(cartItems)
    .set({ quantity: Math.max(1, Math.min(quantity, Math.max(cap, 1))) })
    .where(and(eq(cartItems.cartId, cart.id), eq(cartItems.skuId, skuId)));
  revalidatePath("/", "layout");
  return loadCartView(cart.id);
}

export async function removeCartItem(skuId: string): Promise<CartView> {
  const { cart } = await resolveActiveCart();
  await db().delete(cartItems).where(and(eq(cartItems.cartId, cart.id), eq(cartItems.skuId, skuId)));
  revalidatePath("/", "layout");
  return loadCartView(cart.id);
}

export async function clearCart(): Promise<CartView> {
  const { cart } = await resolveActiveCart();
  await db().delete(cartItems).where(eq(cartItems.cartId, cart.id));
  revalidatePath("/", "layout");
  return loadCartView(cart.id);
}

export async function mergeGuestCartIntoUser() {
  await mergeGuest();
  revalidatePath("/", "layout");
}

export async function importLegacyCart(lines: Array<{ skuId: string; quantity: number }>): Promise<CartView> {
  const view = await importLegacyCartLines(lines);
  revalidatePath("/", "layout");
  return view;
}
