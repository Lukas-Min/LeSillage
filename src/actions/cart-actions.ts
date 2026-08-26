"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db/client";
import { carts, cartItems, skus } from "@/db/schema";
import { auth } from "@/auth";
import { rateLimit, getRequestKey } from "@/lib/rate-limit";
import { clampQuantity } from "@/domain/money";

const GUEST_CART_COOKIE = "le-sillage-guest-cart";

async function getOrCreateCartForUser(userId: string) {
  const client = db();
  const existing = (await client.select().from(carts).where(eq(carts.userId, userId)))[0];
  if (existing) return existing;
  const inserted = await client.insert(carts).values({ userId }).returning();
  return inserted[0];
}

async function getOrCreateGuestCart(): Promise<{ token: string; cart: typeof carts.$inferSelect }> {
  const store = await cookies();
  let token = store.get(GUEST_CART_COOKIE)?.value;
  let issued = false;
  if (!token) {
    token = crypto.randomUUID();
    issued = true;
  }
  const client = db();
  let cart = (await client.select().from(carts).where(eq(carts.guestToken, token)))[0];
  if (!cart) {
    cart = (await client.insert(carts).values({ guestToken: token }).returning())[0];
  }
  if (issued) {
    store.set(GUEST_CART_COOKIE, token, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });
  }
  return { token, cart };
}

async function addOneToCart(cart: { id: string }, sku: typeof skus.$inferSelect, quantity: number) {
  const client = db();
  const cap = sku.fulfillment === "PRE_ORDER" ? 99 : sku.stock;
  const clamped = clampQuantity(quantity, cap);
  const existing = (
    await client
      .select()
      .from(cartItems)
      .where(and(eq(cartItems.cartId, cart.id), eq(cartItems.skuId, sku.id)))
  )[0];
  if (existing) {
    const next = clampQuantity(existing.quantity + clamped, cap);
    await client
      .update(cartItems)
      .set({ quantity: next })
      .where(eq(cartItems.id, existing.id));
  } else {
    await client.insert(cartItems).values({ cartId: cart.id, skuId: sku.id, quantity: clamped });
  }
}

export async function addItemToCart(skuId: string, requestedQuantity: number) {
  const session = await auth();
  const subject = session?.user?.id ?? (await getOrCreateGuestCart()).token;
  const bucket = session?.user ? "CHECKOUT" : "CHECKOUT";
  const decision = await rateLimit({
    bucket,
    key: await getRequestKey("cart-add", subject),
    limit: 60,
    windowMs: 60_000,
  });
  if (!decision.allowed) throw new Error("Too many requests. Please slow down.");

  const cart = session?.user
    ? await getOrCreateCartForUser(session.user.id as string)
    : (await getOrCreateGuestCart()).cart;

  const client = db();
  const skuRow = (await client.select().from(skus).where(eq(skus.id, skuId)))[0];
  if (!skuRow || !skuRow.isActive) throw new Error("That item is unavailable");
  await addOneToCart(cart, skuRow, requestedQuantity);
  revalidatePath("/", "layout");
}

export async function updateCartItem(skuId: string, quantity: number) {
  const session = await auth();
  if (!session?.user) throw new Error("Please sign in to update your cart");
  const cart = await getOrCreateCartForUser(session.user.id as string);
  const client = db();
  const skuRow = (await client.select().from(skus).where(eq(skus.id, skuId)))[0];
  if (!skuRow) throw new Error("Item not found");
  const cap = skuRow.fulfillment === "PRE_ORDER" ? 99 : skuRow.stock;
  if (quantity <= 0) {
    await client
      .delete(cartItems)
      .where(and(eq(cartItems.cartId, cart.id), eq(cartItems.skuId, skuId)));
  } else {
    const next = clampQuantity(quantity, cap);
    await client
      .update(cartItems)
      .set({ quantity: next })
      .where(and(eq(cartItems.cartId, cart.id), eq(cartItems.skuId, skuId)));
  }
  revalidatePath("/", "layout");
}

export async function clearCart() {
  const session = await auth();
  if (!session?.user) return;
  const cart = await getOrCreateCartForUser(session.user.id as string);
  await db().delete(cartItems).where(eq(cartItems.cartId, cart.id));
  revalidatePath("/", "layout");
}

export async function mergeGuestCartIntoUser() {
  const session = await auth();
  if (!session?.user) return;
  const store = await cookies();
  const token = store.get(GUEST_CART_COOKIE)?.value;
  if (!token) return;
  const client = db();
  const userCart = await getOrCreateCartForUser(session.user.id as string);
  const guestCart = (await client.select().from(carts).where(eq(carts.guestToken, token)))[0];
  if (!guestCart) return;
  const guestItems = await client.select().from(cartItems).where(eq(cartItems.cartId, guestCart.id));
  if (guestItems.length > 0) {
    const skusById = new Map(
      (await client.select().from(skus).where(
        inArray(skus.id, guestItems.map((i) => i.skuId)),
      )).map((s) => [s.id, s]),
    );
    for (const item of guestItems) {
      const sku = skusById.get(item.skuId);
      if (!sku || !sku.isActive) continue;
      await addOneToCart(userCart, sku, item.quantity);
    }
  }
  await client.delete(cartItems).where(eq(cartItems.cartId, guestCart.id));
  await client.delete(carts).where(eq(carts.id, guestCart.id));
  store.delete(GUEST_CART_COOKIE);
  revalidatePath("/", "layout");
}
