"use server";

import { revalidatePath } from "next/cache";
import { and, count, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { signOut, requireActiveCustomer } from "@/auth";
import { db } from "@/db/client";
import {
  addresses,
  notificationLog,
  orders,
  products,
  users,
  wishlists,
} from "@/db/schema";
import { rateLimit, getRequestKey } from "@/lib/rate-limit";
import { auditLogSubject } from "@/lib/audit";
import { eraseUserAccount } from "@/lib/account";
import { phMobileRequiredSchema } from "@/domain/phone";
import { isTerminal } from "@/domain/order-state";
import { consumeVerificationCode, issueVerificationCode } from "@/lib/verification-code";
import { hashPassword, validatePassword, verifyPassword } from "@/lib/password";
import { sendEmail } from "@/lib/email";
import {
  changeEmailEmail,
  reauthEmail,
  securityNoticeEmail,
} from "@/lib/email-templates";

async function limitAccount(userId: string, key: string) {
  const decision = await rateLimit({
    bucket: "ACCOUNT",
    key: await getRequestKey(key, userId),
    limit: 20,
    windowMs: 60_000,
  });
  if (!decision.allowed) throw new Error("Too many requests. Please slow down.");
}

const addressSchema = z.object({
  label: z.string().max(40).optional(),
  recipientName: z.string().min(2).max(120),
  phone: phMobileRequiredSchema,
  region: z.string().min(1),
  province: z.string().min(1),
  city: z.string().min(1),
  barangay: z.string().min(1),
  postalCode: z.string().regex(/^\d{4}$/, "Postal code must be 4 digits"),
  street: z.string().min(1),
  isDefault: z.boolean().optional(),
});

export async function updateProfile(formData: FormData) {
  const user = await requireActiveCustomer();
  await limitAccount(user.id, "profile");
  const name = z.string().min(2).max(120).parse(String(formData.get("name") ?? ""));
  const phone = phMobileRequiredSchema.parse(String(formData.get("phone") ?? ""));
  await db()
    .update(users)
    .set({ name, phone: `+63${phone}` })
    .where(eq(users.id, user.id));
  await auditLogSubject({
    actor: user.id,
    action: "ACCOUNT_UPDATE",
    targetType: "user",
    targetId: user.id,
  });
  revalidatePath("/account/profile");
  revalidatePath("/checkout");
}

export async function updateNotificationPreferences(formData: FormData) {
  const user = await requireActiveCustomer();
  await limitAccount(user.id, "notifications");
  const marketingOptIn = formData.get("marketingOptIn") === "on";
  await db().update(users).set({ marketingOptIn }).where(eq(users.id, user.id));
  revalidatePath("/account/notifications");
}

export type ToggleWishlistResult = { ok: true; saved: boolean } | { ok: false; error: string };

/**
 * Returns a typed result instead of throwing for expected failures (not
 * signed in, rate-limited, product unavailable). This action is called from
 * a client component's useTransition + try/catch — a thrown Error here was
 * reaching WishlistButton's own catch fine, but Next's separate internal
 * handling for a thrown server action (the automatic post-action Router
 * refresh) was *also* seeing the same throw and crashing with a generic
 * "Server Components render" error in production only (never reproduced in
 * dev). Returning a plain value sidesteps that path entirely.
 */
export async function toggleWishlist(productId: string): Promise<ToggleWishlistResult> {
  let user: Awaited<ReturnType<typeof requireActiveCustomer>>;
  try {
    user = await requireActiveCustomer();
  } catch {
    return { ok: false, error: "Please sign in to save items" };
  }
  try {
    await limitAccount(user.id, "wishlist");
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Too many requests" };
  }
  const product = (await db().select().from(products).where(eq(products.id, productId)))[0];
  if (!product || !product.isActive) return { ok: false, error: "That fragrance is unavailable" };
  const existing = (
    await db()
      .select()
      .from(wishlists)
      .where(and(eq(wishlists.userId, user.id), eq(wishlists.productId, productId)))
  )[0];
  if (existing) {
    await db().delete(wishlists).where(eq(wishlists.id, existing.id));
    // Wishlist change is already committed; an audit-log hiccup must not
    // fail the toggle the customer is waiting on (the same class of bug as
    // an order's status email — see the notification-log hardening in
    // transitionOrderStatus, src/lib/orders.ts).
    await auditLogSubject({
      actor: user.id,
      action: "WISHLIST_TOGGLE",
      targetType: "product",
      targetId: productId,
      metadata: { saved: false },
    }).catch(() => {});
    revalidatePath("/account/wishlist");
    return { ok: true, saved: false };
  }
  await db().insert(wishlists).values({ userId: user.id, productId });
  await auditLogSubject({
    actor: user.id,
    action: "WISHLIST_TOGGLE",
    targetType: "product",
    targetId: productId,
    metadata: { saved: true },
  }).catch(() => {});
  revalidatePath("/account/wishlist");
  return { ok: true, saved: true };
}

export async function removeFromWishlist(wishlistId: string) {
  const user = await requireActiveCustomer();
  await db()
    .delete(wishlists)
    .where(and(eq(wishlists.id, wishlistId), eq(wishlists.userId, user.id)));
  revalidatePath("/account/wishlist");
}

export async function createAddress(formData: FormData) {
  const user = await requireActiveCustomer();
  await limitAccount(user.id, "address-create");
  const parsed = addressSchema.parse({
    label: formData.get("label") || undefined,
    recipientName: formData.get("recipientName"),
    phone: formData.get("phone"),
    region: formData.get("region"),
    province: formData.get("province"),
    city: formData.get("city"),
    barangay: formData.get("barangay"),
    postalCode: formData.get("postalCode"),
    street: formData.get("street"),
    isDefault: formData.get("isDefault") === "on",
  });
  const [{ value: existing }] = await db()
    .select({ value: count() })
    .from(addresses)
    .where(eq(addresses.userId, user.id));
  if (Number(existing) >= 5) throw new Error("You can save up to 5 addresses");
  const phone = `+63${parsed.phone}`;
  const inserted = await db()
    .insert(addresses)
    .values({
      userId: user.id,
      label: parsed.label ?? null,
      recipientName: parsed.recipientName,
      phone,
      region: parsed.region,
      province: parsed.province,
      city: parsed.city,
      barangay: parsed.barangay,
      postalCode: parsed.postalCode,
      street: parsed.street,
      isDefault: parsed.isDefault ?? Number(existing) === 0,
    })
    .returning();
  if (parsed.isDefault || Number(existing) === 0) {
    await setDefaultAddress(inserted[0].id);
  }
  await auditLogSubject({
    actor: user.id,
    action: "ADDRESS_CREATE",
    targetType: "address",
    targetId: inserted[0].id,
  });
  revalidatePath("/account/addresses");
  revalidatePath("/checkout");
}

export async function updateAddress(formData: FormData) {
  const user = await requireActiveCustomer();
  const addressId = String(formData.get("addressId") ?? "");
  const parsed = addressSchema.parse({
    label: formData.get("label") || undefined,
    recipientName: formData.get("recipientName"),
    phone: formData.get("phone"),
    region: formData.get("region"),
    province: formData.get("province"),
    city: formData.get("city"),
    barangay: formData.get("barangay"),
    postalCode: formData.get("postalCode"),
    street: formData.get("street"),
    isDefault: formData.get("isDefault") === "on",
  });
  await db()
    .update(addresses)
    .set({
      label: parsed.label ?? null,
      recipientName: parsed.recipientName,
      phone: `+63${parsed.phone}`,
      region: parsed.region,
      province: parsed.province,
      city: parsed.city,
      barangay: parsed.barangay,
      postalCode: parsed.postalCode,
      street: parsed.street,
    })
    .where(and(eq(addresses.id, addressId), eq(addresses.userId, user.id)));
  if (parsed.isDefault) await setDefaultAddress(addressId);
  await auditLogSubject({
    actor: user.id,
    action: "ADDRESS_UPDATE",
    targetType: "address",
    targetId: addressId,
  });
  revalidatePath("/account/addresses");
}

export async function deleteAddress(formData: FormData) {
  const user = await requireActiveCustomer();
  const addressId = String(formData.get("addressId") ?? "");
  await db()
    .delete(addresses)
    .where(and(eq(addresses.id, addressId), eq(addresses.userId, user.id)));
  await db()
    .update(users)
    .set({ defaultAddressId: null })
    .where(and(eq(users.id, user.id), eq(users.defaultAddressId, addressId)));
  await auditLogSubject({
    actor: user.id,
    action: "ADDRESS_DELETE",
    targetType: "address",
    targetId: addressId,
  });
  revalidatePath("/account/addresses");
}

export async function setDefaultAddressForm(formData: FormData) {
  await setDefaultAddress(String(formData.get("addressId") ?? ""));
}

export async function setDefaultAddress(addressId: string) {
  const user = await requireActiveCustomer();
  const owned = (
    await db()
      .select()
      .from(addresses)
      .where(and(eq(addresses.id, addressId), eq(addresses.userId, user.id)))
  )[0];
  if (!owned) throw new Error("Address not found");
  await db().update(addresses).set({ isDefault: false }).where(eq(addresses.userId, user.id));
  await db().update(addresses).set({ isDefault: true }).where(eq(addresses.id, addressId));
  await db().update(users).set({ defaultAddressId: addressId }).where(eq(users.id, user.id));
  revalidatePath("/account/addresses");
  revalidatePath("/checkout");
}

export async function requestReauthCode() {
  const user = await requireActiveCustomer();
  await limitAccount(user.id, "reauth");
  const issued = await issueVerificationCode({ identifier: user.email, purpose: "REAUTH" });
  if (issued.resentTooSoon) throw new Error("Please wait a moment before requesting another code");
  if (issued.code) {
    const sent = await sendEmail({ to: user.email, ...reauthEmail(issued.code) });
    await db().insert(notificationLog).values({
      recipient: user.email,
      template: "reauth",
      status: sent.ok ? "SENT" : "FAILED",
      error: sent.ok ? null : sent.error ?? "unknown",
    });
  }
}

export async function changePassword(formData: FormData) {
  const user = await requireActiveCustomer();
  await limitAccount(user.id, "password-change");
  const code = String(formData.get("code") ?? "");
  const current = String(formData.get("currentPassword") ?? "");
  const next = String(formData.get("password") ?? "");
  const passwordError = validatePassword(next);
  if (passwordError) throw new Error(passwordError);
  const verified = await consumeVerificationCode({
    identifier: user.email,
    purpose: "REAUTH",
    code,
  });
  if (!verified.ok) throw new Error(verified.error ?? "Invalid code");
  const row = (await db().select().from(users).where(eq(users.id, user.id)))[0];
  if (row?.passwordHash) {
    const ok = await verifyPassword(current, row.passwordHash);
    if (!ok) throw new Error("Current password is incorrect");
  }
  await db()
    .update(users)
    .set({ passwordHash: await hashPassword(next), sessionVersion: sql`${users.sessionVersion} + 1` })
    .where(eq(users.id, user.id));
  await sendEmail({
    to: user.email,
    ...securityNoticeEmail({
      subject: "Your Le Sillage password changed",
      body: "The password on your Le Sillage account was just changed.",
    }),
  });
  await auditLogSubject({
    actor: user.id,
    action: "AUTH_PASSWORD_CHANGE",
    targetType: "user",
    targetId: user.id,
  });
  revalidatePath("/account/profile");
}

export async function requestEmailChange(formData: FormData) {
  const user = await requireActiveCustomer();
  const nextEmail = z.string().email().parse(String(formData.get("email") ?? "")).toLowerCase();
  const issued = await issueVerificationCode({
    identifier: nextEmail,
    purpose: "CHANGE_EMAIL",
    metadata: { userId: user.id, previousEmail: user.email },
  });
  if (issued.code) {
    await sendEmail({ to: nextEmail, ...changeEmailEmail(issued.code) });
    await sendEmail({
      to: user.email,
      ...securityNoticeEmail({
        subject: "Email change requested",
        body: `A request was made to change your Le Sillage email to ${nextEmail}.`,
      }),
    });
  }
}

export async function confirmEmailChange(formData: FormData) {
  const user = await requireActiveCustomer();
  const nextEmail = z.string().email().parse(String(formData.get("email") ?? "")).toLowerCase();
  const code = String(formData.get("code") ?? "");
  const verified = await consumeVerificationCode({
    identifier: nextEmail,
    purpose: "CHANGE_EMAIL",
    code,
  });
  if (!verified.ok) throw new Error(verified.error ?? "Invalid code");
  await db()
    .update(users)
    .set({
      email: nextEmail,
      emailVerified: new Date(),
      sessionVersion: sql`${users.sessionVersion} + 1`,
    })
    .where(eq(users.id, user.id));
  await sendEmail({
    to: user.email,
    ...securityNoticeEmail({
      subject: "Your Le Sillage email changed",
      body: `Your account email is now ${nextEmail}.`,
    }),
  });
  await auditLogSubject({
    actor: user.id,
    action: "AUTH_EMAIL_CHANGE",
    targetType: "user",
    targetId: user.id,
  });
  revalidatePath("/account/profile");
}

export async function deleteAccount(formData: FormData) {
  const user = await requireActiveCustomer();
  const confirmEmail = String(formData.get("confirmEmail") ?? "").trim().toLowerCase();
  const code = String(formData.get("code") ?? "");
  if (confirmEmail !== user.email.toLowerCase()) throw new Error("Type your email to confirm");
  const role = (await db().select({ role: users.role }).from(users).where(eq(users.id, user.id)))[0];
  if (role?.role === "ADMIN") throw new Error("Admin accounts cannot be deleted here");
  const verified = await consumeVerificationCode({
    identifier: user.email,
    purpose: "REAUTH",
    code,
  });
  if (!verified.ok) throw new Error(verified.error ?? "Invalid code");
  const openOrders = await db().select({ status: orders.status }).from(orders).where(eq(orders.userId, user.id));
  if (openOrders.some((order) => !isTerminal(order.status))) {
    throw new Error("Complete or cancel open orders before deleting your account");
  }
  await eraseUserAccount(user.id);
  await auditLogSubject({
    actor: user.id,
    action: "ACCOUNT_DELETE",
    targetType: "user",
    targetId: user.id,
  });
  await signOut({ redirectTo: "/" });
}

export type ArchiveAccountResult = { ok: true } | { ok: false; error: string };

// Archiving is reversible (logging back in within 30 days un-archives — see
// the `signIn` callback in src/auth.ts) so, unlike deleteAccount, it doesn't
// block on open orders: nothing is erased yet. The 30-day sweep
// (src/lib/archive-sweep.ts) is what needs to check for open orders before
// actually erasing data.
export async function archiveAccount(formData: FormData): Promise<ArchiveAccountResult> {
  const user = await requireActiveCustomer();
  await limitAccount(user.id, "archive");
  const row = (
    await db().select({ role: users.role, passwordHash: users.passwordHash }).from(users).where(eq(users.id, user.id))
  )[0];
  if (row?.role === "ADMIN") return { ok: false, error: "Admin accounts cannot be archived here" };
  if (row?.passwordHash) {
    const password = String(formData.get("password") ?? "");
    const ok = await verifyPassword(password, row.passwordHash);
    if (!ok) return { ok: false, error: "Incorrect password" };
  } else {
    // OAuth-only account, no password to check — fall back to the same
    // REAUTH email-code flow deleteAccount already uses for everyone.
    const code = String(formData.get("code") ?? "");
    const verified = await consumeVerificationCode({ identifier: user.email, purpose: "REAUTH", code });
    if (!verified.ok) return { ok: false, error: verified.error ?? "Invalid code" };
  }
  await db()
    .update(users)
    .set({ archivedAt: new Date(), sessionVersion: sql`${users.sessionVersion} + 1` })
    .where(eq(users.id, user.id));
  await auditLogSubject({
    actor: user.id,
    action: "ACCOUNT_ARCHIVE",
    targetType: "user",
    targetId: user.id,
  });
  await signOut({ redirectTo: "/" });
  return { ok: true };
}
