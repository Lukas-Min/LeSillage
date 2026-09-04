"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { auth } from "@/auth";
import { db } from "@/db/client";
import { orders } from "@/db/schema";
import { createOrderFromCart, submitReceipt, transitionOrderStatus } from "@/lib/orders";
import { rateLimit, getRequestKey } from "@/lib/rate-limit";
import { phMobileRequiredSchema } from "@/domain/phone";
import { canTransition } from "@/domain/order-state";

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
      postalCode: z.string().min(4),
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

export async function createCheckoutOrder(input: unknown) {
  const session = await auth();
  if (!session?.user) throw new Error("Please sign in to checkout");
  const decision = await rateLimit({
    bucket: "CHECKOUT",
    key: await getRequestKey("checkout", session.user.id as string),
    limit: 20,
    windowMs: 60_000,
  });
  if (!decision.allowed) throw new Error("Too many requests. Please slow down.");
  const parsed = checkoutSchema.parse(input);
  if (parsed.fulfillmentMethod === "DELIVERY" && !parsed.savedAddressId && !parsed.addressSnapshot) {
    throw new Error("A delivery address is required");
  }
  const result = await createOrderFromCart({
    user: {
      userId: session.user.id as string,
      email: parsed.email,
      recipientName: parsed.recipientName,
      phone: parsed.phone,
    },
    fulfillmentMethod: parsed.fulfillmentMethod,
    recipientName: parsed.recipientName,
    email: parsed.email,
    phone: parsed.phone,
    addressSnapshot: parsed.addressSnapshot ?? null,
    pickupNotes: parsed.pickupNotes ?? null,
    notes: parsed.notes ?? null,
    savedAddressId: parsed.savedAddressId ?? null,
    saveAddress: parsed.saveAddress ?? false,
    promoCode: parsed.promoCode ?? null,
    directItems: parsed.directItem ? [parsed.directItem] : undefined,
  });
  // Only the pages that read cart/order data server-side. Revalidating the
  // whole layout here busted every route's router cache on each order —
  // the same ~600ms of waste cart-actions.ts already documents and removed.
  revalidatePath("/checkout");
  revalidatePath("/checkout/payment");
  revalidatePath("/account/orders");
  revalidatePath(`/account/orders/${result.order.id}`);
  return { orderId: result.order.id, orderNumber: result.order.orderNumber };
}

export async function submitPaymentReceipt(formData: FormData) {
  const session = await auth();
  if (!session?.user) throw new Error("Please sign in to upload a receipt");
  const orderId = formData.get("orderId");
  const file = formData.get("file");
  const note = formData.get("note");
  if (typeof orderId !== "string") throw new Error("Order id missing");
  if (!(file instanceof File)) throw new Error("Receipt image required");
  const decision = await rateLimit({
    bucket: "RECEIPT",
    key: await getRequestKey("receipt", session.user.id as string),
    limit: 8,
    windowMs: 60_000,
  });
  if (!decision.allowed) throw new Error("Too many requests. Please slow down.");
  const buffer = await file.arrayBuffer();
  const result = await submitReceipt({
    orderId,
    userId: session.user.id as string,
    file: { name: file.name, type: file.type, bytes: buffer },
    note: typeof note === "string" ? note : null,
  });
  if (!result.ok) throw new Error(result.error ?? "Upload failed");
  revalidatePath("/account/orders");
}

// Customers can cancel their own order any time before it ships — the same
// AWAITING_PAYMENT/RECEIPT_SUBMITTED/CONFIRMED -> CANCELLED transitions the
// admin side allows (src/domain/order-state.ts), just self-service. Once an
// order is SHIPPED it's already in transit and can't be pulled back.
export async function cancelOrder(orderId: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Please sign in to cancel an order");
  const decision = await rateLimit({
    bucket: "CHECKOUT",
    key: await getRequestKey("cancel-order", session.user.id as string),
    limit: 8,
    windowMs: 60_000,
  });
  if (!decision.allowed) throw new Error("Too many requests. Please slow down.");

  const order = (
    await db()
      .select({ id: orders.id, status: orders.status })
      .from(orders)
      .where(and(eq(orders.id, orderId), eq(orders.userId, session.user.id as string)))
  )[0];
  if (!order) throw new Error("Order not found");
  if (!canTransition(order.status, "CANCELLED")) {
    throw new Error("This order can no longer be cancelled");
  }

  await transitionOrderStatus({ orderId, next: "CANCELLED", reason: "Cancelled by customer" });
  revalidatePath("/account/orders");
}
