"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { cartItems, carts, productDiscounts, products, skus } from "@/db/schema";
import { clampQuantity } from "@/domain/money";
import { withSiteWideDiscount } from "@/domain/discount";
import type { SizePickerOption } from "@/domain/variant-options";
import { buildVariantOptions } from "@/lib/catalog";
import { rateLimit, getRequestKey } from "@/lib/rate-limit";
import {
  addOneToCart,
  checkGuestCartMerge as checkGuestCartMergeLib,
  effectiveFulfillment,
  importLegacyCartLines,
  loadCartView,
  loadPromoConfig,
  mergeGuestCartIntoUser as mergeGuest,
  resolveActiveCart,
  resolveCartCap,
  resolveGuestCartConflict as resolveGuestCartConflictLib,
  type CartView,
  type GuestCartMergeState,
} from "@/lib/cart";

export async function getCart(): Promise<CartView> {
  const { cart } = await resolveActiveCart();
  return loadCartView(cart.id);
}

export async function addItemToCart(skuId: string, requestedQuantity: number): Promise<CartView> {
  const { cart, subject } = await resolveActiveCart();
  // Rate limiting, promo config, and the SKU lookup are all independent of
  // each other — run them together instead of one round trip after another.
  const [decision, promoConfig, found] = await Promise.all([
    rateLimit({
      bucket: "CHECKOUT",
      key: await getRequestKey("cart-add", subject),
      limit: 60,
      windowMs: 60_000,
    }),
    loadPromoConfig(),
    db()
      .select({ sku: skus, productType: products.type, remainingMl: products.remainingMl })
      .from(skus)
      .innerJoin(products, eq(products.id, skus.productId))
      .where(eq(skus.id, skuId))
      .then((rows) => rows[0]),
  ]);
  if (!decision.allowed) throw new Error("Too many requests. Please slow down.");
  if (!found || !found.sku.isActive) throw new Error("That item is unavailable");
  await addOneToCart(
    cart,
    { ...found.sku, productType: found.productType, remainingMl: found.remainingMl },
    requestedQuantity,
    promoConfig.decantPreOrderThresholdMl,
  );
  // Cart badge/drawer/page are all client-managed state, updated directly
  // from this action's own return value — none of them need a server
  // revalidation. Checkout is the only page that reads cart data
  // server-side, so it's the only path worth invalidating here and at every
  // other revalidatePath call in this file. Revalidating the whole layout
  // (as this used to, everywhere) forced every route's Server Components to
  // re-render on every cart click, including /shop's full catalog query —
  // measured ~600ms of pure waste on top of the action's own DB work.
  revalidatePath("/checkout");
  return loadCartView(cart.id, undefined, promoConfig);
}

export async function updateCartItem(skuId: string, quantity: number): Promise<CartView> {
  const { cart } = await resolveActiveCart();
  if (quantity <= 0) {
    await db()
      .delete(cartItems)
      .where(and(eq(cartItems.cartId, cart.id), eq(cartItems.skuId, skuId)));
    revalidatePath("/checkout");
    return loadCartView(cart.id);
  }
  const [found, promoConfig] = await Promise.all([
    db()
      .select({ sku: skus, productType: products.type, remainingMl: products.remainingMl })
      .from(skus)
      .innerJoin(products, eq(products.id, skus.productId))
      .where(eq(skus.id, skuId))
      .then((rows) => rows[0]),
    loadPromoConfig(),
  ]);
  if (!found) throw new Error("Item not found");
  const fulfillment = effectiveFulfillment({
    productType: found.productType,
    skuFulfillment: found.sku.fulfillment,
    sizeMl: found.sku.sizeMl,
    remainingMl: found.remainingMl,
    thresholdMl: promoConfig.decantPreOrderThresholdMl,
    provenance: found.sku.provenance,
  });
  const cap = resolveCartCap({
    productType: found.productType,
    fulfillment,
    sizeMl: found.sku.sizeMl,
    remainingMl: found.remainingMl,
    stock: found.sku.stock,
    provenance: found.sku.provenance,
  });
  if (cap <= 0) throw new Error("This item is currently out of stock");
  await db()
    .update(cartItems)
    .set({ quantity: clampQuantity(quantity, cap) })
    .where(and(eq(cartItems.cartId, cart.id), eq(cartItems.skuId, skuId)));
  revalidatePath("/checkout");
  return loadCartView(cart.id, undefined, promoConfig);
}

export async function removeCartItem(skuId: string): Promise<CartView> {
  const { cart } = await resolveActiveCart();
  await db().delete(cartItems).where(and(eq(cartItems.cartId, cart.id), eq(cartItems.skuId, skuId)));
  revalidatePath("/checkout");
  return loadCartView(cart.id);
}

export async function clearCart(): Promise<CartView> {
  const { cart } = await resolveActiveCart();
  await db().delete(cartItems).where(eq(cartItems.cartId, cart.id));
  revalidatePath("/checkout");
  return loadCartView(cart.id);
}

export async function mergeGuestCartIntoUser() {
  await mergeGuest();
  revalidatePath("/checkout");
}

/** Call right after sign-in to see if the guest cart and account cart both have items before merging. */
export async function checkGuestCartMerge(): Promise<GuestCartMergeState> {
  return checkGuestCartMergeLib();
}

/** Resolves a guest-vs-account cart conflict the user was asked to choose between. */
export async function resolveGuestCartConflict(strategy: "keep-account" | "use-guest"): Promise<CartView> {
  const view = await resolveGuestCartConflictLib(strategy);
  revalidatePath("/checkout");
  return view;
}

export async function importLegacyCart(lines: Array<{ skuId: string; quantity: number }>): Promise<CartView> {
  const view = await importLegacyCartLines(lines);
  revalidatePath("/checkout");
  return view;
}

/**
 * Sibling sizes for the same product as `skuId`, for the cart drawer's
 * "Customize" size picker. Self-contained (looks up productId itself)
 * rather than widening CartLineView with a productId field that would
 * ripple into checkout/order-snapshot code for a need that's local to this
 * one feature. Fulfillment per size is computed for real via the shared
 * buildDecantSizeOptions (src/lib/catalog.ts) — same helper the PDP's buy
 * box uses. DECANT only — other product types don't get a size picker
 * anywhere in the store.
 */
export async function getSiblingSkuOptions(skuId: string): Promise<SizePickerOption[]> {
  const client = db();
  const current = (
    await client
      .select({ productId: skus.productId, productType: products.type, remainingMl: products.remainingMl })
      .from(skus)
      .innerJoin(products, eq(products.id, skus.productId))
      .where(eq(skus.id, skuId))
  )[0];
  if (!current || current.productType !== "DECANT") return [];
  const [siblings, discounts, promoConfig] = await Promise.all([
    client
      .select({
        skuId: skus.id,
        sizeMl: skus.sizeMl,
        retailPrice: skus.retailPrice,
        condition: skus.condition,
        provenance: skus.provenance,
        packaging: skus.packaging,
        fulfillment: skus.fulfillment,
        stock: skus.stock,
        isTester: skus.isTester,
      })
      .from(skus)
      .where(and(eq(skus.productId, current.productId), eq(skus.isActive, true))),
    client.select().from(productDiscounts).where(eq(productDiscounts.productId, current.productId)),
    loadPromoConfig(),
  ]);
  const discountsWithSiteWide = withSiteWideDiscount(discounts, current.productId, promoConfig.siteWideDiscount);
  return buildVariantOptions(siblings, discountsWithSiteWide, {
    isDecant: true,
    remainingMl: current.remainingMl ?? 0,
    thresholdMl: promoConfig.decantPreOrderThresholdMl,
  });
}

/**
 * Swaps a cart line to a different size of the same product, preserving
 * quantity (clamped to the destination size's real cap). Not composed
 * client-side from removeCartItem + addItemToCart: quantity must carry
 * over, and the destination size might already be a separate line — that
 * case must merge atomically or the cart could end up with two rows for
 * the same SKU (the (cartId, skuId) unique index forbids that) or silently
 * lose quantity if a two-step client operation is interrupted.
 */
export async function changeCartItemSize(fromSkuId: string, toSkuId: string): Promise<CartView> {
  const { cart } = await resolveActiveCart();
  if (fromSkuId === toSkuId) return loadCartView(cart.id);
  const client = db();
  const [fromItem, toFound, promoConfig] = await Promise.all([
    client
      .select()
      .from(cartItems)
      .where(and(eq(cartItems.cartId, cart.id), eq(cartItems.skuId, fromSkuId)))
      .then((r) => r[0]),
    client
      .select({ sku: skus, productType: products.type, remainingMl: products.remainingMl })
      .from(skus)
      .innerJoin(products, eq(products.id, skus.productId))
      .where(eq(skus.id, toSkuId))
      .then((r) => r[0]),
    loadPromoConfig(),
  ]);
  if (!fromItem) throw new Error("Item not in cart");
  if (!toFound || !toFound.sku.isActive) throw new Error("That size is unavailable");
  const fulfillment = effectiveFulfillment({
    productType: toFound.productType,
    skuFulfillment: toFound.sku.fulfillment,
    sizeMl: toFound.sku.sizeMl,
    remainingMl: toFound.remainingMl,
    thresholdMl: promoConfig.decantPreOrderThresholdMl,
    provenance: toFound.sku.provenance,
  });
  const cap = resolveCartCap({
    productType: toFound.productType,
    fulfillment,
    sizeMl: toFound.sku.sizeMl,
    remainingMl: toFound.remainingMl,
    stock: toFound.sku.stock,
    provenance: toFound.sku.provenance,
  });
  if (cap <= 0) throw new Error("That size is currently out of stock");
  await client.transaction(async (tx) => {
    // Locks the cart row for the rest of this transaction, serializing
    // concurrent size swaps on the same cart. Without this, two swaps to the
    // same destination size can both read "no existing line" under READ
    // COMMITTED and race into a unique-constraint violation on
    // (cartId, skuId) — a plain row lock on the destination lookup below
    // wouldn't help when neither transaction's destination row exists yet.
    await tx.select().from(carts).where(eq(carts.id, cart.id)).for("update");
    const existingTo = (
      await tx.select().from(cartItems).where(and(eq(cartItems.cartId, cart.id), eq(cartItems.skuId, toSkuId)))
    )[0];
    if (existingTo) {
      const merged = clampQuantity(existingTo.quantity + fromItem.quantity, cap);
      await tx.update(cartItems).set({ quantity: merged }).where(eq(cartItems.id, existingTo.id));
      await tx.delete(cartItems).where(eq(cartItems.id, fromItem.id));
    } else {
      const clamped = clampQuantity(fromItem.quantity, cap);
      await tx.update(cartItems).set({ skuId: toSkuId, quantity: clamped }).where(eq(cartItems.id, fromItem.id));
    }
  });
  revalidatePath("/checkout");
  return loadCartView(cart.id, undefined, promoConfig);
}
