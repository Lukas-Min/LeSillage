import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db/client";
import {
  carts,
  cartItems,
  orders,
  orderItems,
  receipts,
  skus,
  products,
  productDiscounts,
  promoSettings,
  qrCodes,
  stockMovements,
  notificationLog,
  users,
  type FulfillmentMethod,
  type OrderStatus,
} from "@/db/schema";
import { priceCart, type PricingOptions } from "@/domain/cart";
import { generateOrderNumber } from "@/domain/order-number";
import { DEFAULT_PROMO_CONFIG, isTesterBonusEligible } from "@/domain/promo";
import { uploadPrivateImage } from "@/lib/blob";
import { sendEmail } from "@/lib/email";
import { getEnv } from "@/lib/env";
import {
  adminReceiptNotification,
  orderConfirmedEmail,
  orderShippedEmail,
  receiptRejectedEmail,
  receiptSubmittedEmail,
} from "@/lib/email-templates";

export interface CustomerContext {
  userId: string;
  email: string;
  recipientName: string;
  phone: string;
}

export interface CreateOrderInput {
  user: CustomerContext;
  fulfillmentMethod: FulfillmentMethod;
  recipientName: string;
  email: string;
  phone: string;
  addressSnapshot?: Record<string, unknown> | null;
  pickupNotes?: string | null;
  notes?: string | null;
  cartId?: string | null;
}

export async function loadActiveCartForUser(userId: string) {
  const client = db();
  const userCart = await client.select().from(carts).where(eq(carts.userId, userId));
  let cart = userCart[0];
  if (!cart) {
    cart = (await client.insert(carts).values({ userId }).returning())[0];
  }
  const items = await client
    .select({ id: cartItems.id, skuId: cartItems.skuId, quantity: cartItems.quantity })
    .from(cartItems)
    .where(eq(cartItems.cartId, cart.id));
  return { cart, items };
}

interface PromoConfig {
  decantThresholdCentavos: number;
  deliveryFeeCentavos: number;
  freeDeliveryEnabled: boolean;
  testerBonusEnabled: boolean;
}

async function loadPromoConfig(): Promise<PromoConfig> {
  const row = (await db().select().from(promoSettings).where(eq(promoSettings.id, "singleton")))[0];
  return {
    decantThresholdCentavos: row?.decantThresholdCentavos ?? DEFAULT_PROMO_CONFIG.decantThresholdCentavos,
    deliveryFeeCentavos: row?.deliveryFeeCentavos ?? DEFAULT_PROMO_CONFIG.deliveryFeeCentavos,
    freeDeliveryEnabled: row?.freeDeliveryEnabled ?? DEFAULT_PROMO_CONFIG.freeDeliveryEnabled,
    testerBonusEnabled: row?.testerBonusEnabled ?? DEFAULT_PROMO_CONFIG.testerBonusEnabled,
  };
}

export async function createOrderFromCart(input: CreateOrderInput) {
  const client = db();
  const { cart, items } = await loadActiveCartForUser(input.user.userId);
  if (items.length === 0) throw new Error("Your cart is empty");

  const skuIds = items.map((it) => it.skuId);
  const skuRows = await client
    .select({
      sku: skus,
      productType: products.type,
      productBrand: products.brand,
      productFamily: products.family,
      productId: products.id,
      productName: products.name,
      productCategory: products.fragranceCategory,
    })
    .from(skus)
    .innerJoin(products, eq(products.id, skus.productId))
    .where(inArray(skus.id, skuIds));
  if (skuRows.length !== items.length) {
    throw new Error("Some items in your cart are no longer available");
  }

  const discounts = await client
    .select()
    .from(productDiscounts)
    .where(
      inArray(
        productDiscounts.productId,
        Array.from(new Set(skuRows.map((s) => s.sku.productId))),
      ),
    );

  const promoConfig = await loadPromoConfig();
  const isPickup = input.fulfillmentMethod === "PICKUP";

  const priced = priceCart(
    items.map((item) => {
      const found = skuRows.find((row) => row.sku.id === item.skuId);
      if (!found) throw new Error("Cart item missing product data");
      return {
        sku: found.sku,
        quantity: item.quantity,
        productType: found.productType,
        productBrand: found.productBrand,
        productFamily: found.productFamily,
        discounts: discounts.filter((d) => d.productId === found.sku.productId),
      };
    }),
    {
      deliveryFeeCentavos: isPickup ? 0 : promoConfig.deliveryFeeCentavos,
      freeShipping: isPickup ? true : promoConfig.freeDeliveryEnabled,
    } as PricingOptions,
  );

  const testerEligible =
    !isPickup &&
    promoConfig.testerBonusEnabled &&
    isTesterBonusEligible(
      priced.lines.map((line) => ({
        productType: line.productType,
        discountedLineTotalCentavos: line.lineSubtotalCentavos,
      })),
      {
        decantThresholdCentavos: promoConfig.decantThresholdCentavos,
        deliveryFeeCentavos: promoConfig.deliveryFeeCentavos,
        freeDeliveryEnabled: promoConfig.freeDeliveryEnabled,
        testerBonusEnabled: promoConfig.testerBonusEnabled,
      },
    );

  const orderNumber = generateOrderNumber();
  const e164Phone = `+63${input.phone.replace(/\D/g, "").slice(-10)}`;
  const created = await client
    .insert(orders)
    .values({
      orderNumber,
      userId: input.user.userId,
      status: "AWAITING_PAYMENT",
      fulfillmentMethod: input.fulfillmentMethod,
      recipientName: input.recipientName,
      email: input.email,
      phone: e164Phone,
      addressSnapshot: input.addressSnapshot ?? null,
      pickupNotes: input.pickupNotes ?? null,
      notes: input.notes ?? null,
      subtotalCentavos: priced.merchandiseSubtotalCentavos,
      discountCentavos: priced.discountCentavos,
      deliveryFeeCentavos: priced.deliveryFeeCentavos,
      totalCentavos: priced.totalCentavos,
      promoTesterResult: testerEligible ? "PENDING" : "SKIPPED",
    })
    .returning();
  const order = created[0];

  await client.insert(orderItems).values(
    priced.lines.map((line) => {
      const found = skuRows.find((row) => row.sku.id === line.skuId);
      if (!found) throw new Error("Cart item missing product data");
      return {
        orderId: order.id,
        skuId: line.skuId,
        productName: found.productName,
        skuLabel: found.sku.label,
        productType: found.productType,
        fragranceCategory: found.productCategory,
        condition: found.sku.condition,
        provenance: found.sku.provenance,
        packaging: found.sku.packaging,
        fulfillment: found.sku.fulfillment,
        quantity: line.quantity,
        originalUnitCentavos: line.unitPriceCentavos,
        unitPriceCentavos: line.discountedUnitCentavos,
        discountCentavos: line.lineDiscountCentavos,
        lineTotalCentavos: line.lineSubtotalCentavos,
      };
    }),
  );

  await client.delete(cartItems).where(eq(cartItems.cartId, cart.id));

  return { order, totals: priced, orderItems: priced.lines, skuRows, promoConfig };
}

export async function loadActiveQrs() {
  return db()
    .select()
    .from(qrCodes)
    .where(eq(qrCodes.isActive, true))
    .orderBy(qrCodes.position);
}

export interface SubmitReceiptInput {
  orderId: string;
  userId: string;
  file: { name: string; type: string; bytes: ArrayBuffer };
  note?: string | null;
}

export interface SubmitReceiptResult {
  ok: boolean;
  error?: string;
}

export async function submitReceipt(
  input: SubmitReceiptInput,
): Promise<SubmitReceiptResult> {
  const client = db();
  const orderRow = (
    await client
      .select()
      .from(orders)
      .where(and(eq(orders.id, input.orderId), eq(orders.userId, input.userId)))
  )[0];
  if (!orderRow) return { ok: false, error: "Order not found" };
  if (
    orderRow.status === "RECEIPT_SUBMITTED" ||
    orderRow.status === "CONFIRMED" ||
    orderRow.status === "SHIPPED" ||
    orderRow.status === "COMPLETED"
  ) {
    return { ok: false, error: "A receipt has already been submitted for this order" };
  }
  if (orderRow.status === "REJECTED" || orderRow.status === "CANCELLED") {
    return { ok: false, error: "This order is no longer accepting receipts" };
  }

  const uploaded = await uploadPrivateImage(`receipts/${orderRow.id}`, input.file);
  await client.insert(receipts).values({
    orderId: orderRow.id,
    blobUrl: uploaded.url,
    note: input.note ?? null,
  });

  await reserveStockForOrder(orderRow.id);

  await client
    .update(orders)
    .set({ status: "RECEIPT_SUBMITTED", updatedAt: new Date(), statusUpdatedAt: new Date() })
    .where(eq(orders.id, orderRow.id));

  const itemRows = await client
    .select()
    .from(orderItems)
    .where(eq(orderItems.orderId, orderRow.id));

  const env = getEnv();
  const promo = (await client.select().from(promoSettings).where(eq(promoSettings.id, "singleton")))[0];
  const emailInput = {
    orderNumber: orderRow.orderNumber,
    status: "RECEIPT_SUBMITTED" as OrderStatus,
    recipientName: orderRow.recipientName,
    email: orderRow.email,
    fulfillmentMethod: orderRow.fulfillmentMethod,
    lines: itemRows.map((line) => ({
      productName: line.productName,
      skuLabel: line.skuLabel,
      quantity: line.quantity,
      originalUnitCentavos: line.originalUnitCentavos,
      unitPriceCentavos: line.unitPriceCentavos,
      discountCentavos: line.discountCentavos,
      lineTotalCentavos: line.lineTotalCentavos,
      productType: line.productType,
      fulfillment: line.fulfillment,
    })),
    subtotalCentavos: orderRow.subtotalCentavos,
    discountCentavos: orderRow.discountCentavos,
    deliveryFeeCentavos: orderRow.deliveryFeeCentavos,
    totalCentavos: orderRow.totalCentavos,
    defaultDeliveryFeeCentavos: promo?.deliveryFeeCentavos,
    freeDeliveryReason:
      orderRow.deliveryFeeCentavos === 0 && orderRow.fulfillmentMethod === "DELIVERY"
        ? "Free delivery applied: decant subtotal over ₱2,000."
        : null,
    orderedAt: orderRow.createdAt,
    pickupNotes: orderRow.pickupNotes,
  };

  const customer = await sendEmail({
    to: orderRow.email,
    ...receiptSubmittedEmail(emailInput),
  });
  await client.insert(notificationLog).values({
    orderId: orderRow.id,
    recipient: orderRow.email,
    template: "receipt_submitted",
    status: customer.ok ? "SENT" : "FAILED",
    error: customer.ok ? null : customer.error ?? "unknown error",
  });
  const admin = await sendEmail({
    to: env.ADMIN_EMAIL,
    ...adminReceiptNotification(emailInput),
  });
  await client.insert(notificationLog).values({
    orderId: orderRow.id,
    recipient: env.ADMIN_EMAIL,
    template: "admin_receipt_notification",
    status: admin.ok ? "SENT" : "FAILED",
    error: admin.ok ? null : admin.error ?? "unknown error",
  });

  return { ok: true };
}

async function tryReserveOneSku(skuId: string, quantity: number): Promise<boolean> {
  const client = db();
  const result = await client.execute<{ stock: number }>(
    sql`UPDATE sku SET "stock" = "stock" - ${quantity} WHERE "id" = ${skuId} AND "stock" >= ${quantity} AND "isActive" = true RETURNING "stock"`,
  );
  return result.rows.length > 0;
}

async function tryReserveTesterSku(skuId: string): Promise<boolean> {
  const client = db();
  const result = await client.execute<{ stock: number }>(
    sql`UPDATE sku SET "stock" = "stock" - 1 WHERE "id" = ${skuId} AND "stock" >= 1 AND "isTester" = true AND "isActive" = true RETURNING "stock"`,
  );
  return result.rows.length > 0;
}

export async function reserveStockForOrder(orderId: string): Promise<void> {
  const client = db();
  const orderRow = (await client.select().from(orders).where(eq(orders.id, orderId)))[0];
  if (!orderRow) return;
  const items = await client
    .select()
    .from(orderItems)
    .where(eq(orderItems.orderId, orderId));

  return client.transaction(async (tx) => {
    for (const item of items) {
      if (item.fulfillment !== "ON_HAND") continue;
      const ok = await tryReserveOneSku(item.skuId, item.quantity);
      if (!ok) throw new Error(`Not enough stock for order ${orderId}`);
      await tx.insert(stockMovements).values({
        skuId: item.skuId,
        delta: -item.quantity,
        reason: "ORDER_RESERVED",
        orderId,
      });
    }

    if (orderRow.promoTesterResult === "PENDING") {
      const purchased = items.filter((it) => it.fulfillment === "ON_HAND");
      if (purchased.length === 0) {
        await tx.update(orders).set({ promoTesterResult: "SKIPPED" }).where(eq(orders.id, orderId));
        return;
      }
      const purchasedProducts = await tx
        .select({
          skuId: skus.id,
          brand: products.brand,
          family: products.family,
        })
        .from(skus)
        .innerJoin(products, eq(products.id, skus.productId))
        .where(inArray(skus.id, purchased.map((it) => it.skuId)));
      const purchasedFamilies = new Set<string>();
      const purchasedBrands = new Set<string>();
      for (const p of purchasedProducts) {
        if (p.brand) purchasedBrands.add(p.brand);
        if (p.family) purchasedFamilies.add(p.family);
      }
      const candidates = await tx
        .select({
          id: skus.id,
          family: skus.testerFamily,
          brand: skus.testerBrand,
        })
        .from(skus)
        .where(and(eq(skus.isTester, true), eq(skus.isActive, true), sql`${skus.stock} > 0`));
      const pickFamily = candidates.filter((c) => c.family && purchasedFamilies.has(c.family));
      const pool =
        pickFamily.length > 0
          ? pickFamily
          : candidates.filter((c) => purchasedBrands.has(c.brand ?? ""));
      const finalPool = pool.length > 0 ? pool : candidates;
      if (finalPool.length === 0) {
        await tx.update(orders).set({ promoTesterResult: "SKIPPED" }).where(eq(orders.id, orderId));
        return;
      }
      const chosen = finalPool[Math.floor(Math.random() * finalPool.length)];
      const ok = await tryReserveTesterSku(chosen.id);
      if (!ok) {
        await tx.update(orders).set({ promoTesterResult: "SKIPPED" }).where(eq(orders.id, orderId));
        return;
      }
      await tx.insert(stockMovements).values({
        skuId: chosen.id,
        delta: -1,
        reason: "TESTER_ASSIGNED",
        orderId,
      });
      await tx
        .update(orders)
        .set({ promoTesterResult: "ASSIGNED", promoTesterSkuId: chosen.id })
        .where(eq(orders.id, orderId));
    }
  });
}

export async function releaseStockForOrder(orderId: string): Promise<void> {
  const client = db();
  return client.transaction(async (tx) => {
    const reserved = await tx
      .select()
      .from(stockMovements)
      .where(and(eq(stockMovements.orderId, orderId), eq(stockMovements.reason, "ORDER_RESERVED")));
    if (reserved.length === 0) return;
    const alreadyReleased = new Set<string>();
    const existingReleases = await tx
      .select()
      .from(stockMovements)
      .where(and(eq(stockMovements.orderId, orderId), eq(stockMovements.reason, "ORDER_RELEASED")));
    for (const m of existingReleases) {
      alreadyReleased.add(`${m.skuId}:${-m.delta}`);
    }
    for (const movement of reserved) {
      const key = `${movement.skuId}:${-movement.delta}`;
      if (alreadyReleased.has(key)) continue;
      await tx.execute(
        sql`UPDATE sku SET "stock" = "stock" - ${movement.delta} WHERE "id" = ${movement.skuId}`,
      );
      await tx.insert(stockMovements).values({
        skuId: movement.skuId,
        delta: -movement.delta,
        reason: "ORDER_RELEASED",
        orderId,
      });
    }

    const tester = await tx
      .select()
      .from(stockMovements)
      .where(and(eq(stockMovements.orderId, orderId), eq(stockMovements.reason, "TESTER_ASSIGNED")));
    const testerReleased = new Set<string>();
    const existingTesterReleases = await tx
      .select()
      .from(stockMovements)
      .where(and(eq(stockMovements.orderId, orderId), eq(stockMovements.reason, "TESTER_RELEASED")));
    for (const m of existingTesterReleases) {
      testerReleased.add(`${m.skuId}:${-m.delta}`);
    }
    for (const movement of tester) {
      const key = `${movement.skuId}:${1}`;
      if (testerReleased.has(key)) continue;
      await tx.execute(
        sql`UPDATE sku SET "stock" = "stock" - ${movement.delta} WHERE "id" = ${movement.skuId}`,
      );
      await tx.insert(stockMovements).values({
        skuId: movement.skuId,
        delta: -movement.delta,
        reason: "TESTER_RELEASED",
        orderId,
      });
    }
  });
}

interface OrderEmailData {
  orderNumber: string;
  recipientName: string;
  email: string;
  fulfillmentMethod: FulfillmentMethod;
  subtotalCentavos: number;
  discountCentavos: number;
  deliveryFeeCentavos: number;
  totalCentavos: number;
  createdAt: Date;
  pickupNotes?: string | null;
}

async function loadOrderForEmail(orderId: string): Promise<OrderEmailData | null> {
  const client = db();
  const row = (await client.select().from(orders).where(eq(orders.id, orderId)))[0];
  if (!row) return null;
  return {
    orderNumber: row.orderNumber,
    recipientName: row.recipientName,
    email: row.email,
    fulfillmentMethod: row.fulfillmentMethod,
    subtotalCentavos: row.subtotalCentavos,
    discountCentavos: row.discountCentavos,
    deliveryFeeCentavos: row.deliveryFeeCentavos,
    totalCentavos: row.totalCentavos,
    createdAt: row.createdAt,
    pickupNotes: row.pickupNotes,
  };
}

export async function transitionOrderStatus(args: {
  orderId: string;
  next: OrderStatus;
  reason?: string | null;
}): Promise<void> {
  const client = db();
  const orderRow = (await client.select().from(orders).where(eq(orders.id, args.orderId)))[0];
  if (!orderRow) throw new Error("Order not found");

  if (args.next === "REJECTED" || args.next === "CANCELLED") {
    if (!args.reason || args.reason.trim().length === 0) {
      throw new Error("A reason is required to reject or cancel an order");
    }
  }

  await client
    .update(orders)
    .set({
      status: args.next,
      statusReason: args.reason ?? null,
      statusUpdatedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(orders.id, args.orderId));

  if (args.next === "REJECTED") {
    await releaseStockForOrder(args.orderId);
  }

  const context = await loadOrderForEmail(args.orderId);
  if (!context) return;
  const items = await client
    .select()
    .from(orderItems)
    .where(eq(orderItems.orderId, args.orderId));
  const emailInput = {
    orderNumber: context.orderNumber,
    status: args.next,
    recipientName: context.recipientName,
    email: context.email,
    fulfillmentMethod: context.fulfillmentMethod,
    lines: items.map((it) => ({
      productName: it.productName,
      skuLabel: it.skuLabel,
      quantity: it.quantity,
      originalUnitCentavos: it.originalUnitCentavos,
      unitPriceCentavos: it.unitPriceCentavos,
      discountCentavos: it.discountCentavos,
      lineTotalCentavos: it.lineTotalCentavos,
      productType: it.productType,
      fulfillment: it.fulfillment,
    })),
    subtotalCentavos: context.subtotalCentavos,
    discountCentavos: context.discountCentavos,
    deliveryFeeCentavos: context.deliveryFeeCentavos,
    totalCentavos: context.totalCentavos,
    orderedAt: context.createdAt,
    reason: args.reason,
    pickupNotes: context.pickupNotes,
  };

  if (args.next === "REJECTED") {
    const r = await sendEmail({ to: context.email, ...receiptRejectedEmail(emailInput) });
    await client.insert(notificationLog).values({
      orderId: args.orderId,
      recipient: context.email,
      template: "receipt_rejected",
      status: r.ok ? "SENT" : "FAILED",
      error: r.ok ? null : r.error ?? "unknown error",
    });
  }
  if (args.next === "CONFIRMED") {
    const r = await sendEmail({ to: context.email, ...orderConfirmedEmail(emailInput) });
    await client.insert(notificationLog).values({
      orderId: args.orderId,
      recipient: context.email,
      template: "order_confirmed",
      status: r.ok ? "SENT" : "FAILED",
      error: r.ok ? null : r.error ?? "unknown error",
    });
  }
  if (args.next === "SHIPPED") {
    const r = await sendEmail({ to: context.email, ...orderShippedEmail(emailInput) });
    await client.insert(notificationLog).values({
      orderId: args.orderId,
      recipient: context.email,
      template: "order_shipped",
      status: r.ok ? "SENT" : "FAILED",
      error: r.ok ? null : r.error ?? "unknown error",
    });
  }
}

export async function ensureCustomer(email: string, name: string): Promise<string> {
  const client = db();
  const existing = (
    await client.select().from(users).where(eq(users.email, email.toLowerCase()))
  )[0];
  if (existing) return existing.id;
  const inserted = await client
    .insert(users)
    .values({ email: email.toLowerCase(), name })
    .returning();
  return inserted[0].id;
}
