import { and, count, eq, gte, inArray, notInArray, sql } from "drizzle-orm";
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
  promoCodes,
  promoCodeRedemptions,
  qrCodes,
  stockMovements,
  notificationLog,
  users,
  addresses,
  type FulfillmentMethod,
  type OrderStatus,
  type PromoCode,
} from "@/db/schema";
import { priceCart } from "@/domain/cart";
import { generateOrderNumber } from "@/domain/order-number";
import { isTesterBonusEligible } from "@/domain/promo";
import { buildCartTotals, type ActivePromoCode } from "@/domain/checkout-totals";
import { checkPromoCodeEligibility } from "@/domain/promo-code";
import { assertTransition } from "@/domain/order-state";
import { mlToReserve } from "@/domain/decant";
import { loadPromoConfig, effectiveFulfillment, resolveCartCap } from "@/lib/cart";
import { clampQuantity } from "@/domain/money";
import { withSiteWideDiscount } from "@/domain/discount";
import { uploadPrivateImage } from "@/lib/blob";
import { sendEmail } from "@/lib/email";
import { getEnv } from "@/lib/env";
import {
  adminReceiptNotification,
  orderCancelledEmail,
  orderConfirmedEmail,
  orderCreatedPaymentEmail,
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
  savedAddressId?: string | null;
  saveAddress?: boolean;
  /** Raw customer input, normalized (trim + uppercase) before lookup — never
   *  trust a client-supplied discount amount, only the code string. */
  promoCode?: string | null;
  /** Buy Now path: when set, the order is built from exactly these items
   *  instead of the customer's persisted cart, and the cart is left
   *  completely untouched (not read, not cleared). */
  directItems?: { skuId: string; quantity: number }[];
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

export async function createOrderFromCart(input: CreateOrderInput) {
  const client = db();
  const usingDirectItems = Boolean(input.directItems && input.directItems.length > 0);
  let cart: Awaited<ReturnType<typeof loadActiveCartForUser>>["cart"] | null = null;
  let items: { skuId: string; quantity: number }[];
  if (usingDirectItems) {
    items = input.directItems!;
  } else {
    const loaded = await loadActiveCartForUser(input.user.userId);
    cart = loaded.cart;
    items = loaded.items;
  }
  if (items.length === 0) throw new Error(usingDirectItems ? "No item selected" : "Your cart is empty");

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
      remainingMl: products.remainingMl,
    })
    .from(skus)
    .innerJoin(products, eq(products.id, skus.productId))
    // isActive is enforced here (not just in the cart/checkout display
    // layer) so a SKU deactivated after being added to a cart — or after a
    // Buy Now link was generated/bookmarked — can't still be ordered.
    .where(and(inArray(skus.id, skuIds), eq(skus.isActive, true)));
  if (skuRows.length !== items.length) {
    throw new Error(
      usingDirectItems ? "This item is no longer available" : "Some items in your cart are no longer available",
    );
  }

  const promoConfig = await loadPromoConfig();

  // Cart quantities are already clamped to resolveCartCap at add-time
  // (addOneToCart) — direct items skip the cart entirely and arrive
  // untrusted from the client, so clamp them here the same way, right
  // before they're priced.
  if (usingDirectItems) {
    items = items.map((item) => {
      const found = skuRows.find((row) => row.sku.id === item.skuId);
      if (!found) return item;
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
      return { ...item, quantity: clampQuantity(item.quantity, cap) };
    });
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

  const isPickup = input.fulfillmentMethod === "PICKUP";
  let addressSnapshot = input.addressSnapshot ?? null;
  let recipientName = input.recipientName;
  let phone = input.phone;
  if (input.savedAddressId) {
    const saved = (
      await client
        .select()
        .from(addresses)
        .where(and(eq(addresses.id, input.savedAddressId), eq(addresses.userId, input.user.userId)))
    )[0];
    if (!saved) throw new Error("Saved address not found");
    addressSnapshot = {
      region: saved.region,
      province: saved.province,
      city: saved.city,
      barangay: saved.barangay,
      postalCode: saved.postalCode,
      street: saved.street,
    };
    recipientName = saved.recipientName;
    phone = saved.phone.replace(/^\+63/, "").replace(/^0/, "");
  }

  const priced = priceCart(
    items.map((item) => {
      const found = skuRows.find((row) => row.sku.id === item.skuId);
      if (!found) throw new Error("Cart item missing product data");
      const fulfillment = effectiveFulfillment({
        productType: found.productType,
        skuFulfillment: found.sku.fulfillment,
        sizeMl: found.sku.sizeMl,
        remainingMl: found.remainingMl,
        thresholdMl: promoConfig.decantPreOrderThresholdMl,
        provenance: found.sku.provenance,
      });
      return {
        sku: { ...found.sku, fulfillment },
        quantity: item.quantity,
        productType: found.productType,
        productBrand: found.productBrand,
        productFamily: found.productFamily,
        discounts: withSiteWideDiscount(
          discounts.filter((d) => d.productId === found.sku.productId),
          found.sku.productId,
          promoConfig.siteWideDiscount,
        ),
      };
    }),
    {
      deliveryFeeCentavos: promoConfig.deliveryFeeCentavos,
      freeShipping: false,
    },
  );
  const testerEligible =
    !isPickup &&
    promoConfig.testerBonusEnabled &&
    isTesterBonusEligible(
      priced.lines.map((line) => ({
        productType: line.productType,
        discountedLineTotalCentavos: line.lineSubtotalCentavos,
      })),
      promoConfig,
    );

  const orderNumber = generateOrderNumber();
  const e164Phone = `+63${phone.replace(/\D/g, "").slice(-10)}`;

  // Promo code validation, redemption recording, and the order insert all
  // happen in one transaction: the code row is locked with `.for("update")`
  // for its whole duration, so two concurrent checkouts racing the same
  // near-exhausted maxRedemptions (or the same onePerCustomer code) can't
  // both pass the eligibility check before either commits — the second
  // waits for the lock, then re-checks against the first's already-applied
  // redemptionCount. Never trust a client-supplied discount amount: only
  // the code string comes from the client, everything else is re-derived
  // here from freshly-loaded state.
  const { order, totals } = await client.transaction(async (tx) => {
    let activePromoCode: ActivePromoCode | null = null;
    let lockedCode: PromoCode | null = null;
    const rawCode = input.promoCode?.trim();
    if (rawCode) {
      const normalizedCode = rawCode.toUpperCase();
      const [codeRow] = await tx
        .select()
        .from(promoCodes)
        .where(eq(promoCodes.code, normalizedCode))
        .for("update");
      if (!codeRow) throw new Error("Invalid promo code");
      const [priorOrderCount, priorRedemption] = await Promise.all([
        tx
          .select({ value: count() })
          .from(orders)
          .where(
            and(
              eq(orders.userId, input.user.userId),
              notInArray(orders.status, ["REJECTED", "CANCELLED"]),
            ),
          ),
        tx
          .select({ id: promoCodeRedemptions.id })
          .from(promoCodeRedemptions)
          .where(
            and(
              eq(promoCodeRedemptions.promoCodeId, codeRow.id),
              eq(promoCodeRedemptions.userId, input.user.userId),
            ),
          )
          .limit(1),
      ]);
      // Pre-code totals give the delivery fee a DELIVERY-scope code would
      // actually be discounting (e.g. 0 already, if free shipping kicked
      // in) — used only to reject a code that would apply zero discount,
      // so it doesn't burn a maxRedemptions/onePerCustomer slot for
      // nothing (see checkPromoCodeEligibility's zero-benefit guard).
      const preCodeTotals = buildCartTotals(priced, promoConfig, input.fulfillmentMethod, null);
      const eligibility = checkPromoCodeEligibility(codeRow, {
        merchandiseSubtotalCentavos: priced.merchandiseSubtotalCentavos,
        deliveryFeeCentavos: preCodeTotals.deliveryFeeCentavos,
        isFirstOrder: Number(priorOrderCount[0]?.value ?? 0) === 0,
        hasPriorRedemption: priorRedemption.length > 0,
      });
      if (!eligibility.ok) throw new Error(eligibility.error);
      lockedCode = codeRow;
      activePromoCode = { scope: codeRow.scope, type: codeRow.type, amount: codeRow.amount };
    }

    const totals = buildCartTotals(priced, promoConfig, input.fulfillmentMethod, activePromoCode);

    const [insertedOrder] = await tx
      .insert(orders)
      .values({
        orderNumber,
        userId: input.user.userId,
        status: "AWAITING_PAYMENT",
        fulfillmentMethod: input.fulfillmentMethod,
        recipientName,
        email: input.email,
        phone: e164Phone,
        addressSnapshot,
        pickupNotes: input.pickupNotes ?? null,
        notes: input.notes ?? null,
        // Item discounts are already baked into merchandiseSubtotalCentavos
        // (existing convention); the promo-code order-discount isn't, so it
        // comes out of subtotalCentavos here too, keeping the stored
        // invariant subtotalCentavos + deliveryFeeCentavos === totalCentavos
        // true for every order regardless of whether a code was used.
        // discountCentavos becomes the informational combined total saved
        // (item + order + delivery) — the itemized breakdown (which code,
        // how much) stays queryable via the promoCodeRedemptions row this
        // order gets below.
        subtotalCentavos: totals.merchandiseSubtotalCentavos - totals.orderDiscountCentavos,
        discountCentavos: totals.discountCentavos + totals.orderDiscountCentavos + totals.deliveryDiscountCentavos,
        deliveryFeeCentavos: totals.deliveryFeeCentavos,
        totalCentavos: totals.totalCentavos,
        promoTesterResult: testerEligible ? "PENDING" : "SKIPPED",
      })
      .returning();

    if (lockedCode) {
      await tx.insert(promoCodeRedemptions).values({
        promoCodeId: lockedCode.id,
        userId: input.user.userId,
        orderId: insertedOrder.id,
      });
      await tx
        .update(promoCodes)
        .set({ redemptionCount: sql`${promoCodes.redemptionCount} + 1` })
        .where(eq(promoCodes.id, lockedCode.id));
    }

    // orderItems and the cart-clear share this transaction with the order
    // row itself: if the orderItems insert throws (a data-integrity issue
    // like a missing product row), the whole order rolls back instead of
    // leaving a committed zero-item order with a burned promo redemption.
    await tx.insert(orderItems).values(
      priced.lines.map((line) => {
        const found = skuRows.find((row) => row.sku.id === line.skuId);
        if (!found) throw new Error("Cart item missing product data");
        return {
          orderId: insertedOrder.id,
          skuId: line.skuId,
          productName: found.productName,
          skuLabel: found.sku.label,
          productType: found.productType,
          fragranceCategory: found.productCategory,
          condition: found.sku.condition,
          provenance: found.sku.provenance,
          packaging: found.sku.packaging,
          fulfillment: line.fulfillment,
          quantity: line.quantity,
          originalUnitCentavos: line.unitPriceCentavos,
          unitPriceCentavos: line.discountedUnitCentavos,
          discountCentavos: line.lineDiscountCentavos,
          lineTotalCentavos: line.lineSubtotalCentavos,
        };
      }),
    );

    // Buy Now never touched the cart in the first place — nothing to clear.
    if (cart) {
      await tx.delete(cartItems).where(eq(cartItems.cartId, cart.id));
    }

    return { order: insertedOrder, totals };
  });

  if (input.saveAddress && !isPickup && addressSnapshot) {
    const existing = Number(
      (
        await client
          .select({ value: count() })
          .from(addresses)
          .where(eq(addresses.userId, input.user.userId))
      )[0]?.value ?? 0,
    );
    if (existing < 5) {
      const snap = addressSnapshot as {
        region: string;
        province: string;
        city: string;
        barangay: string;
        postalCode: string;
        street: string;
      };
      await client.insert(addresses).values({
        userId: input.user.userId,
        recipientName,
        phone: e164Phone,
        region: snap.region,
        province: snap.province,
        city: snap.city,
        barangay: snap.barangay,
        postalCode: snap.postalCode,
        street: snap.street,
        isDefault: existing === 0,
      });
    }
  }

  try {
    const paymentEmail = await sendEmail({
      to: input.email,
      ...orderCreatedPaymentEmail({
        orderNumber,
        status: "AWAITING_PAYMENT",
        recipientName,
        email: input.email,
        fulfillmentMethod: input.fulfillmentMethod,
        lines: priced.lines.map((line) => {
          const found = skuRows.find((row) => row.sku.id === line.skuId);
          return {
            productName: found?.productName ?? "Fragrance",
            skuLabel: found?.sku.label ?? "",
            quantity: line.quantity,
            originalUnitCentavos: line.unitPriceCentavos,
            unitPriceCentavos: line.discountedUnitCentavos,
            discountCentavos: line.lineDiscountCentavos,
            lineTotalCentavos: line.lineSubtotalCentavos,
            productType: line.productType,
            fulfillment: line.fulfillment,
          };
        }),
        // Same convention as the stored order row (see the transaction
        // above): subtotal already has the promo-code order-discount baked
        // in, discountCentavos is the informational combined total.
        subtotalCentavos: totals.merchandiseSubtotalCentavos - totals.orderDiscountCentavos,
        discountCentavos: totals.discountCentavos + totals.orderDiscountCentavos + totals.deliveryDiscountCentavos,
        deliveryFeeCentavos: totals.deliveryFeeCentavos,
        totalCentavos: totals.totalCentavos,
        defaultDeliveryFeeCentavos: totals.defaultDeliveryFeeCentavos,
        freeDeliveryReason: totals.freeShipping && !isPickup ? "Decant subtotal over ₱2,000" : null,
        orderedAt: new Date(),
        pickupNotes: input.pickupNotes,
      }),
    });
    await client.insert(notificationLog).values({
      orderId: order.id,
      recipient: input.email,
      template: "order_created_payment",
      status: paymentEmail.ok ? "SENT" : "FAILED",
      error: paymentEmail.ok ? null : paymentEmail.error ?? "unknown",
    });
  } catch {
    // Order is already committed; email failure must not fail checkout.
  }

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
  // Shared transaction: if stock reservation fails (e.g. sold out between
  // checkout and receipt upload), the receipt row rolls back too instead of
  // leaving an orphaned receipt on an order stuck at AWAITING_PAYMENT.
  await client.transaction(async (tx) => {
    await tx.insert(receipts).values({
      orderId: orderRow.id,
      blobUrl: uploaded.url,
      note: input.note ?? null,
    });

    const items = await tx.select().from(orderItems).where(eq(orderItems.orderId, orderRow.id));
    await reserveStockWithinTx(tx, orderRow.id, orderRow, items);

    await tx
      .update(orders)
      .set({ status: "RECEIPT_SUBMITTED", updatedAt: new Date(), statusUpdatedAt: new Date() })
      .where(eq(orders.id, orderRow.id));
  });

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

async function tryReserveOneSku(
  tx: Pick<ReturnType<typeof db>, "update" | "select">,
  skuId: string,
  quantity: number,
): Promise<boolean> {
  const updated = await tx
    .update(skus)
    .set({ stock: sql`${skus.stock} - ${quantity}` })
    .where(and(eq(skus.id, skuId), gte(skus.stock, quantity), eq(skus.isActive, true)))
    .returning({ stock: skus.stock });
  return updated.length > 0;
}

async function tryReserveTesterSku(
  tx: Pick<ReturnType<typeof db>, "update" | "select">,
  skuId: string,
): Promise<boolean> {
  const updated = await tx
    .update(skus)
    .set({ stock: sql`${skus.stock} - 1` })
    .where(and(eq(skus.id, skuId), gte(skus.stock, 1), eq(skus.isTester, true), eq(skus.isActive, true)))
    .returning({ stock: skus.stock });
  return updated.length > 0;
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
    await reserveStockWithinTx(tx, orderId, orderRow, items);
  });
}

async function reserveStockWithinTx(
  tx: Pick<ReturnType<typeof db>, "select" | "update" | "insert">,
  orderId: string,
  orderRow: typeof orders.$inferSelect,
  items: (typeof orderItems.$inferSelect)[],
): Promise<void> {
  {
    for (const item of items) {
      // A RETAIL decant is reserved like a full-bottle SKU (below, by its
      // own unit stock) — only an IN_HOUSE decant draws from the shared ml
      // pool here.
      if (item.productType === "DECANT" && item.provenance !== "RETAIL" && item.fulfillment === "ON_HAND") {
        const sku = (
          await tx
            .select({ productId: skus.productId, sizeMl: skus.sizeMl })
            .from(skus)
            .where(eq(skus.id, item.skuId))
        )[0];
        if (sku) {
          // Row-locked for the rest of this transaction so a concurrent
          // reservation for the same decant can't read the same
          // remainingMl before either commits and both "succeed",
          // oversubscribing the physical stock.
          const product = (
            await tx
              .select({ remainingMl: products.remainingMl })
              .from(products)
              .where(eq(products.id, sku.productId))
              .for("update")
          )[0];
          const requestedMl = (sku.sizeMl ?? 0) * item.quantity;
          const deduct = mlToReserve({
            remainingMl: product?.remainingMl ?? 0,
            sizeMl: sku.sizeMl ?? 0,
            quantity: item.quantity,
            fulfillment: item.fulfillment,
          });
          // Previously this silently reserved whatever ml was left (even
          // zero) with no error when stock ran out between order creation
          // and receipt submission. Fail loudly instead, matching the
          // unit-SKU path below.
          if (deduct < requestedMl) throw new Error(`Not enough stock for order ${orderId}`);
          await tx
            .update(products)
            .set({ remainingMl: sql`GREATEST(0, ${products.remainingMl} - ${deduct})` })
            .where(eq(products.id, sku.productId));
          await tx.insert(stockMovements).values({
            skuId: item.skuId,
            delta: -deduct,
            reason: "ML_RESERVED",
            orderId,
          });
        }
        continue;
      }
      if (item.fulfillment !== "ON_HAND") continue;
      const ok = await tryReserveOneSku(tx, item.skuId, item.quantity);
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
      const ok = await tryReserveTesterSku(tx, chosen.id);
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
  }
}

export async function releaseStockForOrder(orderId: string): Promise<void> {
  const client = db();
  return client.transaction(async (tx) => {
    const reserved = await tx
      .select()
      .from(stockMovements)
      .where(
        and(
          eq(stockMovements.orderId, orderId),
          inArray(stockMovements.reason, ["ORDER_RESERVED", "ML_RESERVED"]),
        ),
      );
    if (reserved.length === 0) return;
    const alreadyReleased = new Set<string>();
    const existingReleases = await tx
      .select()
      .from(stockMovements)
      .where(
        and(
          eq(stockMovements.orderId, orderId),
          inArray(stockMovements.reason, ["ORDER_RELEASED", "ML_RELEASED"]),
        ),
      );
    for (const m of existingReleases) {
      alreadyReleased.add(`${m.reason === "ML_RELEASED" ? "ml" : "unit"}:${m.skuId}:${-m.delta}`);
    }
    for (const movement of reserved) {
      const isMl = movement.reason === "ML_RESERVED";
      // Release rows store the negation of the reservation's delta (see the
      // insert below), so `alreadyReleased` keys are built as -m.delta to
      // land back on the reservation's own sign convention — this check-key
      // must use movement.delta as-is (not re-negated) to match it.
      const key = `${isMl ? "ml" : "unit"}:${movement.skuId}:${movement.delta}`;
      if (alreadyReleased.has(key)) continue;
      if (isMl) {
        const sku = (await tx.select({ productId: skus.productId }).from(skus).where(eq(skus.id, movement.skuId)))[0];
        if (sku) {
          await tx
            .update(products)
            .set({ remainingMl: sql`${products.remainingMl} - ${movement.delta}` })
            .where(eq(products.id, sku.productId));
        }
        await tx.insert(stockMovements).values({
          skuId: movement.skuId,
          delta: -movement.delta,
          reason: "ML_RELEASED",
          orderId,
        });
      } else {
        await tx
          .update(skus)
          .set({ stock: sql`${skus.stock} - ${movement.delta}` })
          .where(eq(skus.id, movement.skuId));
        await tx.insert(stockMovements).values({
          skuId: movement.skuId,
          delta: -movement.delta,
          reason: "ORDER_RELEASED",
          orderId,
        });
      }
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
      const key = `${movement.skuId}:${movement.delta}`;
      if (testerReleased.has(key)) continue;
      await tx
        .update(skus)
        .set({ stock: sql`${skus.stock} - ${movement.delta}` })
        .where(eq(skus.id, movement.skuId));
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
  assertTransition(orderRow.status, args.next);

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

  if (args.next === "REJECTED" || args.next === "CANCELLED") {
    // releaseStockForOrder is a no-op when the order never had stock
    // reserved (e.g. cancelling from AWAITING_PAYMENT, before any receipt),
    // since it only acts on existing ORDER_RESERVED/ML_RESERVED movements.
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
  if (args.next === "CANCELLED") {
    const r = await sendEmail({ to: context.email, ...orderCancelledEmail(emailInput) });
    await client.insert(notificationLog).values({
      orderId: args.orderId,
      recipient: context.email,
      template: "order_cancelled",
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
