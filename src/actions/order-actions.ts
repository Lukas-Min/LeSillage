"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { auth } from "@/auth";
import { db } from "@/db/client";
import { orderItems, orders } from "@/db/schema";
import {
  CheckoutError,
  createOrderFromCart,
  requestOrderCancellation as requestOrderCancellationLib,
  submitReceipt,
  transitionOrderStatus,
  type CheckoutErrorField,
} from "@/lib/orders";
import { addLinesToCart, loadPromoConfig, resolveActiveCart } from "@/lib/cart";
import { rateLimit, getRequestKey } from "@/lib/rate-limit";
import { auditLogSubject } from "@/lib/audit";
import { phMobileRequiredSchema } from "@/domain/phone";
import { customerCancelMode, isTerminal } from "@/domain/order-state";

const checkoutSchema = z.object({
  fulfillmentMethod: z.enum(["DELIVERY", "PICKUP"]),
  recipientName: z.string().min(2).max(120),
  email: z.string().email(),
  phone: phMobileRequiredSchema,
  addressSnapshot: z
    .object({
      region: z.string().min(1),
      province: z.string().min(1),
      city: z.string().min(1),
      barangay: z.string().min(1),
      postalCode: z.string().regex(/^\d{4}$/, "Postal code must be 4 digits"),
      street: z.string().min(1),
    })
    .nullable()
    .optional(),
  pickupNotes: z.string().max(280).nullable().optional(),
  notes: z.string().max(280).nullable().optional(),
  acceptedTerms: z.literal(true),
  savedAddressId: z.string().min(1).nullable().optional(),
  saveAddress: z.boolean().optional(),
  promoCode: z.string().max(40).nullable().optional(),
  // Buy Now: present only when checkout is for one direct item, bypassing
  // the cart entirely (see createOrderFromCart's directItems).
  directItem: z.object({ skuId: z.string().min(1), quantity: z.number().int().min(1) }).nullable().optional(),
});

/**
 * Expected rejections come back as `{ ok: false, error }` rather than being
 * thrown — Next.js redacts a thrown Server Action error's message in
 * production (the client sees React error #441 and a digest), which would
 * turn "Invalid promo code" / "This item is currently out of stock" into
 * boilerplate. Only unexpected failures still throw.
 */
export type CheckoutResult =
  | { ok: true; orderId: string; orderNumber: string }
  // `field` names the form field the rejection is about, when it's one the
  // form can mark inline (see CheckoutError); absent for whole-order
  // rejections that only make sense as a toast.
  | { ok: false; error: string; field?: CheckoutErrorField };

export async function createCheckoutOrder(input: unknown): Promise<CheckoutResult> {
  const session = await auth();
  if (!session?.user) return { ok: false, error: "Please sign in to checkout" };
  const decision = await rateLimit({
    bucket: "CHECKOUT",
    key: await getRequestKey("checkout", session.user.id as string),
    limit: 20,
    windowMs: 60_000,
  });
  if (!decision.allowed) return { ok: false, error: "Too many requests. Please slow down." };
  const parsed = checkoutSchema.safeParse(input);
  // Zod's own issue text isn't customer-grade; the form's HTML validation
  // already guards every field, so this only trips on a stale/tampered
  // payload.
  if (!parsed.success) return { ok: false, error: "Please check your details and try again." };
  if (parsed.data.fulfillmentMethod === "DELIVERY" && !parsed.data.savedAddressId && !parsed.data.addressSnapshot) {
    return { ok: false, error: "A delivery address is required" };
  }
  try {
    const result = await createOrderFromCart({
      user: {
        userId: session.user.id as string,
        email: parsed.data.email,
        recipientName: parsed.data.recipientName,
        phone: parsed.data.phone,
      },
      fulfillmentMethod: parsed.data.fulfillmentMethod,
      recipientName: parsed.data.recipientName,
      email: parsed.data.email,
      phone: parsed.data.phone,
      addressSnapshot: parsed.data.addressSnapshot ?? null,
      pickupNotes: parsed.data.pickupNotes ?? null,
      notes: parsed.data.notes ?? null,
      savedAddressId: parsed.data.savedAddressId ?? null,
      saveAddress: parsed.data.saveAddress ?? false,
      promoCode: parsed.data.promoCode ?? null,
      directItems: parsed.data.directItem ? [parsed.data.directItem] : undefined,
    });
    // Only the pages that read cart/order data server-side. Revalidating the
    // whole layout here busted every route's router cache on each order —
    // the same ~600ms of waste cart-actions.ts already documents and removed.
    revalidatePath("/checkout");
    revalidatePath("/checkout/payment");
    revalidatePath("/account/orders");
    revalidatePath(`/account/orders/${result.order.id}`);
    return { ok: true, orderId: result.order.id, orderNumber: result.order.orderNumber };
  } catch (error) {
    if (error instanceof CheckoutError) return { ok: false, error: error.message, field: error.field };
    throw error;
  }
}

// Expected rejections come back as `{ ok: false, error }` rather than being
// thrown — same reasoning as CheckoutResult above: a thrown Server Action
// error's message is redacted in production.
export type OrderActionResult = { ok: true } | { ok: false; error: string };

export async function submitPaymentReceipt(formData: FormData): Promise<OrderActionResult> {
  const session = await auth();
  if (!session?.user) return { ok: false, error: "Please sign in to upload a receipt" };
  const orderId = formData.get("orderId");
  const file = formData.get("file");
  const note = formData.get("note");
  if (typeof orderId !== "string") return { ok: false, error: "Order id missing" };
  if (!(file instanceof File)) return { ok: false, error: "Receipt image required" };
  const decision = await rateLimit({
    bucket: "RECEIPT",
    key: await getRequestKey("receipt", session.user.id as string),
    limit: 8,
    windowMs: 60_000,
  });
  if (!decision.allowed) return { ok: false, error: "Too many requests. Please slow down." };
  const buffer = await file.arrayBuffer();
  const result = await submitReceipt({
    orderId,
    userId: session.user.id as string,
    file: { name: file.name, type: file.type, bytes: buffer },
    note: typeof note === "string" ? note : null,
  });
  if (!result.ok) return { ok: false, error: result.error ?? "Upload failed" };
  revalidatePath("/account/orders");
  return { ok: true };
}

// Customers can cancel their own order instantly only before payment is
// verified — AWAITING_PAYMENT/RECEIPT_SUBMITTED -> CANCELLED, gated by
// customerCancelMode(status) === "INSTANT" (src/domain/order-state.ts)
// rather than the broader canTransition: once an order is CONFIRMED it may
// already be getting packed, so cancelling it needs admin approval instead
// (requestOrderCancellation below); once SHIPPED/DELIVERED it's already in
// transit and can't be pulled back this way at all, and a READY_FOR_PICKUP
// no-show cancellation is an admin call (OrderRowActions), not self-service.
export async function cancelOrder(orderId: string, reason: string): Promise<OrderActionResult> {
  const session = await auth();
  if (!session?.user) return { ok: false, error: "Please sign in to cancel an order" };
  if (!reason.trim()) return { ok: false, error: "A reason is required" };
  const decision = await rateLimit({
    bucket: "CHECKOUT",
    key: await getRequestKey("cancel-order", session.user.id as string),
    limit: 8,
    windowMs: 60_000,
  });
  if (!decision.allowed) return { ok: false, error: "Too many requests. Please slow down." };

  const order = (
    await db()
      .select({ id: orders.id, status: orders.status })
      .from(orders)
      .where(and(eq(orders.id, orderId), eq(orders.userId, session.user.id as string)))
  )[0];
  if (!order) return { ok: false, error: "Order not found" };
  if (customerCancelMode(order.status) !== "INSTANT") {
    return { ok: false, error: "This order can no longer be cancelled instantly" };
  }

  await transitionOrderStatus({ orderId, next: "CANCELLED", reason: reason.trim() });
  revalidatePath("/account/orders");
  revalidatePath(`/account/orders/${orderId}`);
  return { ok: true };
}

// Once an order is CONFIRMED, a customer "cancel" only requests it — an
// admin has to approve or deny (OrderRowActions -> resolveCancellationRequest
// in src/actions/admin-actions.ts) before it actually becomes CANCELLED. See
// customerCancelMode/requestOrderCancellation for why.
export async function requestOrderCancellation(orderId: string, reason: string): Promise<OrderActionResult> {
  const session = await auth();
  if (!session?.user) return { ok: false, error: "Please sign in to request a cancellation" };
  if (!reason.trim()) return { ok: false, error: "A reason is required" };
  const decision = await rateLimit({
    bucket: "CHECKOUT",
    key: await getRequestKey("request-cancel-order", session.user.id as string),
    limit: 8,
    windowMs: 60_000,
  });
  if (!decision.allowed) return { ok: false, error: "Too many requests. Please slow down." };

  try {
    await requestOrderCancellationLib({ orderId, userId: session.user.id as string, reason: reason.trim() });
  } catch (error) {
    if (error instanceof Error) return { ok: false, error: error.message };
    throw error;
  }
  auditLogSubject({
    actor: session.user.id as string,
    action: "ORDER_CANCEL_REQUEST",
    targetType: "order",
    targetId: orderId,
    metadata: { reason: reason.trim() },
  });
  revalidatePath("/account/orders");
  revalidatePath(`/account/orders/${orderId}`);
  return { ok: true };
}

export type ReorderResult =
  | { ok: true; added: number; unavailable: string[] }
  | { ok: false; error: string };

// "Re-order" on a finished order (COMPLETED/REJECTED/CANCELLED) puts its
// lines back in the customer's bag at today's prices — it does not clone the
// order or re-apply its promo code, since eligibility and stock are
// re-evaluated at checkout like any other cart. A line whose SKU has since
// been retired or sold out is skipped and named in `unavailable` so the UI
// can say so; quantities are clamped to current stock by addLinesToCart.
export async function reorderOrderItems(orderId: string): Promise<ReorderResult> {
  const session = await auth();
  if (!session?.user) return { ok: false, error: "Please sign in to re-order" };
  const decision = await rateLimit({
    bucket: "CHECKOUT",
    key: await getRequestKey("reorder", session.user.id as string),
    limit: 10,
    windowMs: 60_000,
  });
  if (!decision.allowed) return { ok: false, error: "Too many requests. Please slow down." };

  const client = db();
  const order = (
    await client
      .select({ id: orders.id, status: orders.status })
      .from(orders)
      .where(and(eq(orders.id, orderId), eq(orders.userId, session.user.id as string)))
  )[0];
  if (!order) return { ok: false, error: "Order not found" };
  if (!isTerminal(order.status)) {
    return { ok: false, error: "This order is still in progress" };
  }

  const [items, { cart }, promoConfig] = await Promise.all([
    client
      .select({
        skuId: orderItems.skuId,
        quantity: orderItems.quantity,
        productName: orderItems.productName,
        skuLabel: orderItems.skuLabel,
      })
      .from(orderItems)
      .where(eq(orderItems.orderId, order.id)),
    resolveActiveCart(),
    loadPromoConfig(),
  ]);
  if (items.length === 0) return { ok: false, error: "This order has no items to re-order" };

  const { addedSkuIds, skippedSkuIds } = await addLinesToCart(
    cart,
    items.map((item) => ({ skuId: item.skuId, quantity: item.quantity })),
    promoConfig.decantPreOrderThresholdMl,
  );
  const unavailable = items
    .filter((item) => skippedSkuIds.includes(item.skuId))
    .map((item) => `${item.productName} (${item.skuLabel})`);
  // Checkout is the only route that reads the cart server-side — same
  // reasoning as the revalidatePath calls in src/actions/cart-actions.ts.
  revalidatePath("/checkout");
  return { ok: true, added: addedSkuIds.length, unavailable };
}

// Customer's own "I received it" button on a DELIVERED delivery order —
// the self-service counterpart to the day-2 email's one-tap link
// (confirmDeliveryByToken below) and the day-3 auto-complete cron. Admin can
// also force this via adminTransitionOrder for a customer who confirms by
// phone instead.
export async function confirmOrderReceived(orderId: string): Promise<OrderActionResult> {
  const session = await auth();
  if (!session?.user) return { ok: false, error: "Please sign in to confirm your order" };
  const decision = await rateLimit({
    bucket: "CHECKOUT",
    key: await getRequestKey("confirm-received", session.user.id as string),
    limit: 8,
    windowMs: 60_000,
  });
  if (!decision.allowed) return { ok: false, error: "Too many requests. Please slow down." };

  const order = (
    await db()
      .select({ id: orders.id, status: orders.status })
      .from(orders)
      .where(and(eq(orders.id, orderId), eq(orders.userId, session.user.id as string)))
  )[0];
  if (!order) return { ok: false, error: "Order not found" };
  if (order.status !== "DELIVERED") {
    return { ok: false, error: "This order isn't awaiting a delivery confirmation" };
  }

  await transitionOrderStatus({ orderId, next: "COMPLETED" });
  revalidatePath("/account/orders");
  return { ok: true };
}

// Public, token-gated counterpart of confirmOrderReceived for the day-2
// follow-up email's "Yes, I received it" button — deliberately no sign-in
// (the customer is often on a phone, tapping straight from Gmail/Mail). The
// token is an unguessable UUID minted only when an order becomes DELIVERED
// (src/lib/orders.ts) and cleared again on COMPLETED, so a stale or reused
// link simply stops resolving to anything actionable.
export async function confirmDeliveryByToken(token: string): Promise<OrderActionResult> {
  const decision = await rateLimit({
    bucket: "LOOKUP",
    key: await getRequestKey("delivery-confirm-token", token),
    limit: 10,
    windowMs: 60_000,
  });
  if (!decision.allowed) return { ok: false, error: "Too many requests. Please slow down." };

  const order = (
    await db()
      .select({ id: orders.id, status: orders.status })
      .from(orders)
      .where(eq(orders.deliveryConfirmToken, token))
  )[0];
  if (!order) return { ok: false, error: "This link is no longer valid." };
  // Already completed (customer used the button in their account, or the
  // auto-complete cron beat them to it) — treat a re-click as a success
  // rather than an error, since the outcome the link promised already
  // happened.
  if (order.status === "COMPLETED") return { ok: true };
  if (order.status !== "DELIVERED") {
    return { ok: false, error: "This order can no longer be confirmed here." };
  }

  await transitionOrderStatus({ orderId: order.id, next: "COMPLETED" });
  revalidatePath("/account/orders");
  return { ok: true };
}
