"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/auth";
import { createOrderFromCart, submitReceipt } from "@/lib/orders";
import { rateLimit, getRequestKey } from "@/lib/rate-limit";
import { phMobileRequiredSchema } from "@/domain/phone";

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
  });
  revalidatePath("/", "layout");
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
  await submitReceipt({
    orderId,
    userId: session.user.id as string,
    file: { name: file.name, type: file.type, bytes: buffer },
    note: typeof note === "string" ? note : null,
  });
  revalidatePath("/account/orders");
}
