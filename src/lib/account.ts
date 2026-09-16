import { eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { accounts, addresses, carts, cartItems, sessions, users, wishlists } from "@/db/schema";

/**
 * Anonymizes and erases a user account: scrubs PII off the `users` row
 * (kept, never hard-deleted — `orders.userId` is ON DELETE RESTRICT, since
 * order history is a business record) and removes everything else that
 * cascades cleanly. Shared by the interactive `deleteAccount` action and the
 * 30-day archived-account sweep so this logic exists in exactly one place.
 */
export async function eraseUserAccount(userId: string): Promise<void> {
  const client = db();
  await client.transaction(async (tx) => {
    await tx
      .update(users)
      .set({
        deletedAt: new Date(),
        archivedAt: null,
        name: null,
        email: `deleted+${userId}@anonymized.le-sillage.invalid`,
        phone: null,
        image: null,
        defaultAddressId: null,
        marketingOptIn: false,
        passwordHash: null,
        sessionVersion: sql`${users.sessionVersion} + 1`,
      })
      .where(eq(users.id, userId));
    await tx.delete(accounts).where(eq(accounts.userId, userId));
    await tx.delete(sessions).where(eq(sessions.userId, userId));
    const userCarts = await tx.select({ id: carts.id }).from(carts).where(eq(carts.userId, userId));
    if (userCarts.length > 0) {
      await tx.delete(cartItems).where(inArray(cartItems.cartId, userCarts.map((c) => c.id)));
      await tx.delete(carts).where(eq(carts.userId, userId));
    }
    await tx.delete(addresses).where(eq(addresses.userId, userId));
    await tx.delete(wishlists).where(eq(wishlists.userId, userId));
  });
}
