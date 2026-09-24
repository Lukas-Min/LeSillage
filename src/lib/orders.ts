import { after } from "next/server";
import { and, count, eq, exists, gte, inArray, notInArray, sql } from "drizzle-orm";
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
  type Provenance,
} from "@/db/schema";
import { priceCart } from "@/domain/cart";
import { generateOrderNumber } from "@/domain/order-number";
import { isTesterBonusEligible, pickTester, testerUnitsAvailable } from "@/domain/promo";
import { buildCartTotals, type ActivePromoCode } from "@/domain/checkout-totals";
import { checkPromoCodeEligibility } from "@/domain/promo-code";
import { assertTransition, confirmBlockedReason, customerCancelMode } from "@/domain/order-state";
import { mlToReserve } from "@/domain/decant";
import { loadPromoConfig, effectiveFulfillment, resolveCartCap } from "@/lib/cart";
import { clampQuantity } from "@/domain/money";
import { withSiteWideDiscount } from "@/domain/discount";
import { uploadPrivateImage } from "@/lib/blob";
import { sendEmail } from "@/lib/email";
import { getEnv } from "@/lib/env";
import {
  adminCancellationRequestNotification,
  adminReceiptNotification,
  cancellationRequestDeniedEmail,
  cancellationRequestedEmail,
  orderCancelledEmail,
  orderConfirmedEmail,
  orderCreatedPaymentEmail,
  orderDeliveredEmail,
  orderReadyForPickupEmail,
  orderShippedEmail,
  receiptRejectedEmail,
  receiptSubmittedEmail,
  type OrderEmail,
  type OrderEmailInput,
} from "@/lib/email-templates";
import { loadSkuImageMap, toEmailLines } from "@/lib/order-email-lines";

/**
 * A rejection the customer is meant to read — empty bag, item sold out,
 * invalid promo code, minimum spend not met — as opposed to an unexpected
 * failure (DB down, integrity issue). Server Actions catch this and hand it
 * back as `{ ok: false, error }` rather than letting it propagate: Next.js
 * strips the message off any error *thrown* out of a Server Action in
 * production (the browser only gets React error #441 plus a digest), so a
 * thrown rejection would reach the checkout form as boilerplate instead of
 * "Invalid promo code".
 */
export class CheckoutError extends Error {
  /** Set when the rejection is about one specific checkout field the form
   *  can mark inline (today only the promo code, so a code that stopped
   *  qualifying between preview and submit clears its chip instead of
   *  leaving a stale discount on screen). */
  readonly field?: CheckoutErrorField;

  constructor(message: string, field?: CheckoutErrorField) {
    super(message);
    this.name = "CheckoutError";
    this.field = field;
  }
}

export type CheckoutErrorField = "promoCode";

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
  if (items.length === 0) throw new CheckoutError(usingDirectItems ? "No item selected" : "Your cart is empty");

  const skuIds = items.map((it) => it.skuId);
  const skuRows = await client
    .select({
      sku: skus,
      productType: products.type,
      productBrand: products.brand,
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
    throw new CheckoutError(
      usingDirectItems ? "This item is no longer available" : "Some items in your cart are no longer available",
    );
  }

  const promoConfig = await loadPromoConfig();

  // Cart quantities are clamped to resolveCartCap at add-time (addOneToCart),
  // but stock can move between then and checkout (another customer's receipt
  // reserving the last units) — re-clamp against live stock/cap for every
  // item here, not just direct items, so a sold-out item is caught now
  // rather than only surfacing later at receipt-submit time. Direct items
  // skip the cart entirely and arrive untrusted from the client, so they
  // need this regardless.
  items = items.map((item) => {
    const found = skuRows.find((row) => row.sku.id === item.skuId);
    if (!found) return item;
    const fulfillment = effectiveFulfillment({
      productType: found.productType,
      skuFulfillment: found.sku.fulfillment,
      sizeMl: found.sku.sizeMl,
      remainingMl: found.remainingMl,
      stock: found.sku.stock,
      thresholdMl: promoConfig.decantPreOrderThresholdMl,
      provenance: found.sku.provenance,
      availableForPreOrder: found.sku.availableForPreOrder,
    });
    const cap = resolveCartCap({
      productType: found.productType,
      fulfillment,
      sizeMl: found.sku.sizeMl,
      remainingMl: found.remainingMl,
      stock: found.sku.stock,
      provenance: found.sku.provenance,
      availableForPreOrder: found.sku.availableForPreOrder,
    });
    if (cap <= 0) throw new CheckoutError("This item is currently out of stock");
    return { ...item, quantity: clampQuantity(item.quantity, cap) };
  });

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
    if (!saved) throw new CheckoutError("Saved address not found");
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
        stock: found.sku.stock,
        thresholdMl: promoConfig.decantPreOrderThresholdMl,
        provenance: found.sku.provenance,
        availableForPreOrder: found.sku.availableForPreOrder,
      });
      return {
        sku: { ...found.sku, fulfillment },
        quantity: item.quantity,
        productType: found.productType,
        productBrand: found.productBrand,
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
    // priced/testerEligible above were computed from a snapshot of retailPrice
    // and discounts read before this transaction opened — the only thing
    // that snapshot fed into is this order's stored totals and the promo
    // code's min-spend eligibility below, neither of which re-verified it
    // against live data. Lock the SKU rows now (holding the lock for the
    // rest of this transaction closes the price side entirely; discounts
    // aren't locked, so a comparison here narrows but doesn't fully close
    // that side's window) and fail loudly — like "this item is no longer
    // available" elsewhere in this function — rather than silently persist
    // totals computed from prices/discounts that moved under the order.
    const lockedSkuRows = await tx
      .select({ id: skus.id, retailPrice: skus.retailPrice })
      .from(skus)
      .where(inArray(skus.id, skuIds))
      .for("update");
    const freshDiscounts = await tx
      .select()
      .from(productDiscounts)
      .where(inArray(productDiscounts.productId, Array.from(new Set(skuRows.map((s) => s.sku.productId)))));
    const priceChanged = lockedSkuRows.some((row) => {
      const original = skuRows.find((r) => r.sku.id === row.id);
      return !original || original.sku.retailPrice !== row.retailPrice;
    });
    const discountsChanged =
      freshDiscounts.length !== discounts.length ||
      freshDiscounts.some((fresh) => {
        const original = discounts.find((d) => d.id === fresh.id);
        return (
          !original ||
          original.amount !== fresh.amount ||
          original.type !== fresh.type ||
          original.isActive !== fresh.isActive ||
          (original.startsAt?.getTime() ?? null) !== (fresh.startsAt?.getTime() ?? null) ||
          (original.endsAt?.getTime() ?? null) !== (fresh.endsAt?.getTime() ?? null)
        );
      });
    if (priceChanged || discountsChanged) {
      throw new CheckoutError("Pricing changed while you were checking out — please review your order and try again");
    }

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
      if (!codeRow) throw new CheckoutError("Invalid promo code", "promoCode");
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
      if (!eligibility.ok) throw new CheckoutError(eligibility.error, "promoCode");
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
    try {
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
    } catch {
      // Order is already committed (and the cart cleared / the promo code
      // redeemed); a failed address bookmark must not report the checkout
      // as failed and invite a retry that would place a second order.
    }
  }

  // The order is committed at this point; the confirmation email must
  // neither delay the response nor fail checkout. after() runs it once the
  // response has gone out — the SMTP handshake (up to 8s on a cold
  // transporter) used to sit on the critical path of every "Place order".
  after(async () => {
    try {
      const images = await loadSkuImageMap(priced.lines.map((line) => line.skuId));
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
              imageUrl: images.get(line.skuId) ?? null,
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
  });

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
  let itemRows: (typeof orderItems.$inferSelect)[];
  try {
    itemRows = await client.transaction(async (tx) => {
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
      // Handed to the emails below instead of re-selecting the same rows once
      // the transaction has committed.
      return items;
    });
  } catch (error) {
    // reserveStockWithinTx throws a bare Error when a sold-out item can't be
    // reserved — a real, expected rejection (not a bug), so it must come
    // back as { ok: false } like every other branch here instead of
    // propagating: an uncaught throw out of the submitPaymentReceipt Server
    // Action is redacted by Next.js in production, reaching the customer as
    // a bare failure right after they were told to pay.
    return { ok: false, error: error instanceof Error ? error.message : "Could not submit receipt" };
  }

  // Everything below only feeds the two notification emails; after() runs
  // it once the response is sent, so the upload no longer waits on SMTP.
  after(async () => {
    try {
    const env = getEnv();
    const [promo, fresh] = await Promise.all([
      client.select().from(promoSettings).where(eq(promoSettings.id, "singleton")).then((r) => r[0]),
      // orderRow predates the transaction; the tester auto-pick inside it may
      // have set promoTesterSkuId since.
      client.select({ promoTesterSkuId: orders.promoTesterSkuId }).from(orders).where(eq(orders.id, orderRow.id)).then((r) => r[0]),
    ]);
    const emailInput = {
      orderNumber: orderRow.orderNumber,
      status: "RECEIPT_SUBMITTED" as OrderStatus,
      recipientName: orderRow.recipientName,
      email: orderRow.email,
      fulfillmentMethod: orderRow.fulfillmentMethod,
      lines: await toEmailLines(itemRows),
      testerAwarded: await loadTesterAwarded(fresh?.promoTesterSkuId ?? null),
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

    // Customer and admin notifications are independent — send them together
    // and log both in one insert rather than four sequential round trips.
    const [customer, admin] = await Promise.all([
      sendEmail({ to: orderRow.email, ...receiptSubmittedEmail(emailInput) }),
      sendEmail({ to: env.ADMIN_EMAIL, ...adminReceiptNotification(emailInput) }),
    ]);
    await client.insert(notificationLog).values([
      {
        orderId: orderRow.id,
        recipient: orderRow.email,
        template: "receipt_submitted",
        status: customer.ok ? "SENT" : "FAILED",
        error: customer.ok ? null : customer.error ?? "unknown error",
      },
      {
        orderId: orderRow.id,
        recipient: env.ADMIN_EMAIL,
        template: "admin_receipt_notification",
        status: admin.ok ? "SENT" : "FAILED",
        error: admin.ok ? null : admin.error ?? "unknown error",
      },
    ]);
    } catch {
      // Order/receipt are already committed; email failure must not surface here.
    }
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

// ---------------------------------------------------------------- Free tester

type Tx = Pick<ReturnType<typeof db>, "select" | "update" | "insert">;

/** One tester SKU the auto-pick or the admin may set aside for an order. */
export interface TesterOption {
  skuId: string;
  productId: string;
  productName: string;
  label: string;
  brand: string;
  provenance: Provenance;
  sizeMl: number | null;
  /** Units it can hand out right now — pours left in the pool for an in-house
   *  decant, unit stock for a retail one. Zero means listed but unavailable. */
  unitsAvailable: number;
}

/**
 * Every active decant SKU flagged as a tester. A tester is a decant — the
 * complimentary pour that comes with ₱2,000 of decants — so availability
 * follows the same provenance split the cart uses (`testerUnitsAvailable`).
 * Shared by the auto-pick at receipt time and the admin's picker.
 */
export async function loadTesterOptions(tx: Pick<ReturnType<typeof db>, "select"> = db()): Promise<TesterOption[]> {
  const rows = await tx
    .select({
      skuId: skus.id,
      productId: products.id,
      productName: products.name,
      label: skus.label,
      brand: products.brand,
      provenance: skus.provenance,
      sizeMl: skus.sizeMl,
      stock: skus.stock,
      remainingMl: products.remainingMl,
    })
    .from(skus)
    .innerJoin(products, eq(products.id, skus.productId))
    .where(and(eq(skus.isTester, true), eq(skus.isActive, true), eq(products.type, "DECANT")));
  return rows.map((row) => ({
    skuId: row.skuId,
    productId: row.productId,
    productName: row.productName,
    label: row.label,
    brand: row.brand,
    provenance: row.provenance,
    sizeMl: row.sizeMl,
    unitsAvailable: testerUnitsAvailable(row),
  }));
}

/**
 * Set one unit of a tester aside for an order. Branches on provenance exactly
 * like `reserveStockWithinTx`: an IN_HOUSE decant takes `sizeMl` from the
 * product's pool (TESTER_ML_ASSIGNED), a RETAIL one takes a unit of stock
 * (TESTER_ASSIGNED). Both are conditional updates, so two orders racing for
 * the last pour can't both succeed. Returns false when nothing was left.
 */
async function reserveTesterUnit(
  tx: Tx,
  orderId: string,
  option: Pick<TesterOption, "skuId" | "productId" | "provenance" | "sizeMl">,
): Promise<boolean> {
  if (option.provenance === "IN_HOUSE") {
    const ml = option.sizeMl ?? 0;
    if (ml <= 0) return false;
    const updated = await tx
      .update(products)
      .set({ remainingMl: sql`${products.remainingMl} - ${ml}` })
      .where(
        and(
          eq(products.id, option.productId),
          gte(products.remainingMl, ml),
          // Re-checked atomically, matching the RETAIL branch's
          // eq(skus.isTester, true) below: an admin can un-flag this SKU
          // (setSkuTester) between loadTesterOptions' read and this write,
          // and remainingMl alone wouldn't catch that this SKU is no longer
          // meant to be given away.
          exists(tx.select({ one: sql`1` }).from(skus).where(and(eq(skus.id, option.skuId), eq(skus.isTester, true)))),
        ),
      )
      .returning({ id: products.id });
    if (updated.length === 0) return false;
    await tx.insert(stockMovements).values({ skuId: option.skuId, delta: -ml, reason: "TESTER_ML_ASSIGNED", orderId });
    return true;
  }
  if (!(await tryReserveTesterSku(tx, option.skuId))) return false;
  await tx.insert(stockMovements).values({ skuId: option.skuId, delta: -1, reason: "TESTER_ASSIGNED", orderId });
  return true;
}

/**
 * Hand back whatever tester this order has set aside — ml or a unit,
 * whichever kind of movement reserved it. Counted per SKU rather than
 * keyed, so an order whose tester was swapped A → B → A (three
 * reservations, two releases) still gives back exactly the one it holds.
 */
async function releaseTesterWithinTx(tx: Tx, orderId: string): Promise<void> {
  const movements = await tx
    .select()
    .from(stockMovements)
    .where(
      and(
        eq(stockMovements.orderId, orderId),
        inArray(stockMovements.reason, ["TESTER_ASSIGNED", "TESTER_ML_ASSIGNED", "TESTER_RELEASED", "TESTER_ML_RELEASED"]),
      ),
    );
  // Net units still held, per reservation shape (sku + signed delta).
  const held = new Map<string, { skuId: string; delta: number; isMl: boolean; count: number }>();
  for (const m of movements) {
    const isMl = m.reason === "TESTER_ML_ASSIGNED" || m.reason === "TESTER_ML_RELEASED";
    const isAssign = m.reason === "TESTER_ASSIGNED" || m.reason === "TESTER_ML_ASSIGNED";
    const delta = isAssign ? m.delta : -m.delta;
    const key = `${isMl ? "ml" : "unit"}:${m.skuId}:${delta}`;
    const entry = held.get(key) ?? { skuId: m.skuId, delta, isMl, count: 0 };
    entry.count += isAssign ? 1 : -1;
    held.set(key, entry);
  }
  for (const entry of held.values()) {
    for (let i = 0; i < entry.count; i += 1) {
      if (entry.isMl) {
        const sku = (await tx.select({ productId: skus.productId }).from(skus).where(eq(skus.id, entry.skuId)))[0];
        if (sku) {
          await tx
            .update(products)
            .set({ remainingMl: sql`${products.remainingMl} - ${entry.delta}` })
            .where(eq(products.id, sku.productId));
        }
      } else {
        await tx
          .update(skus)
          .set({ stock: sql`${skus.stock} - ${entry.delta}` })
          .where(eq(skus.id, entry.skuId));
      }
      await tx.insert(stockMovements).values({
        skuId: entry.skuId,
        delta: -entry.delta,
        reason: entry.isMl ? "TESTER_ML_RELEASED" : "TESTER_RELEASED",
        orderId,
      });
    }
  }
}

/**
 * Admin picks (or swaps) the free tester for an order that earned one. The
 * previous pick is handed back and the new one set aside in one transaction,
 * with the order row locked so two admins can't both "win". Allowed while the
 * order is awaiting confirmation or being prepared — the customer has to be
 * told which tester is coming before it ships.
 */
export async function assignTesterToOrder(args: { orderId: string; skuId: string }): Promise<void> {
  const client = db();
  await client.transaction(async (tx) => {
    const orderRow = (await tx.select().from(orders).where(eq(orders.id, args.orderId)).for("update"))[0];
    if (!orderRow) throw new Error("Order not found");
    if (orderRow.status !== "RECEIPT_SUBMITTED" && orderRow.status !== "CONFIRMED") {
      throw new Error("A tester can only be chosen while the order is awaiting confirmation or being prepared");
    }
    if (orderRow.promoTesterResult !== "PENDING" && orderRow.promoTesterResult !== "ASSIGNED") {
      throw new Error("This order did not earn a free tester");
    }
    if (orderRow.promoTesterSkuId === args.skuId) return;
    const option = (await loadTesterOptions(tx)).find((o) => o.skuId === args.skuId);
    if (!option) throw new Error("That SKU is not an active tester");
    // Release first so swapping between two sizes of the same bottle can't
    // fail on millilitres this very order is holding.
    await releaseTesterWithinTx(tx, args.orderId);
    if (!(await reserveTesterUnit(tx, args.orderId, option))) {
      throw new Error(`${option.productName} (${option.label}) just ran out — pick another tester`);
    }
    await tx
      .update(orders)
      .set({ promoTesterResult: "ASSIGNED", promoTesterSkuId: option.skuId, updatedAt: new Date() })
      .where(eq(orders.id, args.orderId));
  });
}

/** "Layton (3ml)" for the customer emails, or null when nothing is set aside. */
async function loadTesterAwarded(skuId: string | null): Promise<{ name: string } | null> {
  if (!skuId) return null;
  const row = (
    await db()
      .select({ name: products.name, label: skus.label })
      .from(skus)
      .innerJoin(products, eq(products.id, skus.productId))
      .where(eq(skus.id, skuId))
  )[0];
  return row ? { name: `${row.name} (${row.label})` } : null;
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

    if (orderRow.promoTesterResult !== "PENDING" || items.length === 0) return;

    const purchasedProducts = await tx
      .select({
        brand: products.brand,
      })
      .from(skus)
      .innerJoin(products, eq(products.id, skus.productId))
      .where(inArray(skus.id, items.map((it) => it.skuId)));
    const purchasedBrands = new Set<string>();
    for (const p of purchasedProducts) {
      if (p.brand) purchasedBrands.add(p.brand);
    }
    // Brand-matched auto-pick; anything it can't place stays PENDING for the
    // admin to choose by hand (never SKIPPED, never an unrelated brand).
    const options = await loadTesterOptions(tx);
    const assignment = pickTester(
      options.map((o) => ({ skuId: o.skuId, brand: o.brand, stock: o.unitsAvailable })),
      purchasedBrands,
    );
    const chosen = options.find((o) => o.skuId === assignment.skuId);
    if (assignment.result !== "ASSIGNED" || !chosen) return;
    if (!(await reserveTesterUnit(tx, orderId, chosen))) return;
    await tx
      .update(orders)
      .set({ promoTesterResult: "ASSIGNED", promoTesterSkuId: chosen.skuId })
      .where(eq(orders.id, orderId));
}

export async function releaseStockForOrder(orderId: string): Promise<void> {
  const client = db();
  return client.transaction(async (tx) => {
    // Locks the order row for the duration of this transaction so two
    // concurrent calls for the same order (its only caller, transitionOrderStatus,
    // is itself now serialized per-order — see its own row lock — but this
    // guards releaseStockForOrder directly too, for any future caller) can't
    // both read the same "nothing released yet" snapshot and both credit
    // stock back a second time.
    await tx.select({ id: orders.id }).from(orders).where(eq(orders.id, orderId)).for("update");
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

    await releaseTesterWithinTx(tx, orderId);
  });
}

// A promo code used on an order that never went through shouldn't be burned
// for the customer — deleting the redemption row is enough on its own: the
// checkout eligibility check only looks at whether a row exists (onePerCustomer)
// and at redemptionCount (maxRedemptions), both read fresh at order time.
export async function releasePromoCodeRedemption(orderId: string): Promise<void> {
  const client = db();
  await client.transaction(async (tx) => {
    const redemption = (
      await tx
        .select({ id: promoCodeRedemptions.id, promoCodeId: promoCodeRedemptions.promoCodeId })
        .from(promoCodeRedemptions)
        .where(eq(promoCodeRedemptions.orderId, orderId))
    )[0];
    if (!redemption) return;
    await tx.delete(promoCodeRedemptions).where(eq(promoCodeRedemptions.id, redemption.id));
    await tx
      .update(promoCodes)
      .set({ redemptionCount: sql`GREATEST(0, ${promoCodes.redemptionCount} - 1)` })
      .where(eq(promoCodes.id, redemption.promoCodeId));
  });
}

// One send + one notificationLog insert per status that emails the
// customer; statuses with no entry (e.g. RECEIPT_SUBMITTED, COMPLETED) send
// nothing here. COMPLETED has none deliberately — it's reached via the
// customer's own action, the day-2 email's link, or the day-3 auto-complete
// cron, none of which need a "we told you what you just told us" email.
const STATUS_EMAIL_TEMPLATES: Partial<
  Record<OrderStatus, { build: (input: OrderEmailInput) => OrderEmail; template: string }>
> = {
  REJECTED: { build: receiptRejectedEmail, template: "receipt_rejected" },
  CANCELLED: { build: orderCancelledEmail, template: "order_cancelled" },
  CONFIRMED: { build: orderConfirmedEmail, template: "order_confirmed" },
  SHIPPED: { build: orderShippedEmail, template: "order_shipped" },
  DELIVERED: { build: orderDeliveredEmail, template: "order_delivered" },
  READY_FOR_PICKUP: { build: orderReadyForPickupEmail, template: "order_ready_for_pickup" },
};

export async function transitionOrderStatus(args: {
  orderId: string;
  next: OrderStatus;
  reason?: string | null;
}): Promise<void> {
  const client = db();
  // Read-validate-write in one transaction, with the order row locked for
  // its duration: two transitions racing on the same order (e.g. a
  // customer's Cancel and an admin's Confirm, both legal from
  // RECEIPT_SUBMITTED) would otherwise both read the same starting status,
  // both pass assertTransition, and whichever UPDATE lands last would
  // silently win regardless of which one's side effects actually ran. The
  // lock makes the second transition wait for the first to commit, then
  // re-validate against the now-current (and for CANCELLED/REJECTED,
  // terminal — see order-state.ts) status instead of a stale snapshot.
  const orderRow = await client.transaction(async (tx) => {
    const row = (await tx.select().from(orders).where(eq(orders.id, args.orderId)).for("update"))[0];
    if (!row) throw new Error("Order not found");
    assertTransition(row.status, args.next);

    if (args.next === "REJECTED" || args.next === "CANCELLED") {
      if (!args.reason || args.reason.trim().length === 0) {
        throw new Error("A reason is required to reject or cancel an order");
      }
    }
    // Same rule the admin UI shows as a disabled Confirm button — enforced
    // here so it holds for any caller, not just that button.
    const blocked = confirmBlockedReason({ next: args.next, promoTesterResult: row.promoTesterResult });
    if (blocked) throw new Error(blocked);

    // DELIVERED mints the token the day-2 follow-up email's one-tap "yes, I
    // received it" link uses (src/app/(store)/order-confirm/[token]) and
    // resets deliveryFollowupSentAt so a re-delivery (rare, but the state
    // machine doesn't forbid SHIPPED -> DELIVERED more than once across
    // orders) gets its own follow-up window. COMPLETED clears both — the
    // token has done its job and a stale link should read as "already
    // confirmed", not silently work forever.
    const deliveryFields =
      args.next === "DELIVERED"
        ? { deliveryConfirmToken: crypto.randomUUID(), deliveryFollowupSentAt: null }
        : args.next === "COMPLETED"
          ? { deliveryConfirmToken: null, deliveryFollowupSentAt: null }
          : {};

    await tx
      .update(orders)
      .set({
        status: args.next,
        statusReason: args.reason ?? null,
        statusUpdatedAt: new Date(),
        updatedAt: new Date(),
        // Any transition (whether it grants a pending cancellation request
        // by moving to CANCELLED, or moves the order on some other path
        // entirely, e.g. an admin ships it before reviewing the request)
        // makes a pending cancellation request moot — clear it so it can't
        // linger and show as still-pending in the admin UI.
        cancellationRequestedAt: null,
        cancellationRequestReason: null,
        ...deliveryFields,
      })
      .where(eq(orders.id, args.orderId));
    return row;
  });

  if (args.next === "REJECTED" || args.next === "CANCELLED") {
    // releaseStockForOrder is a no-op when the order never had stock
    // reserved (e.g. cancelling from AWAITING_PAYMENT, before any receipt),
    // since it only acts on existing ORDER_RESERVED/ML_RESERVED movements.
    await releaseStockForOrder(args.orderId);
    await releasePromoCodeRedemption(args.orderId);
  }

  // The status change is committed (and stock released, where relevant);
  // the customer email runs after the response so admin actions and
  // self-service cancels return as soon as the DB work is done.
  after(async () => {
    const entry = STATUS_EMAIL_TEMPLATES[args.next];
    if (!entry) return;
    try {
      const items = await client
        .select()
        .from(orderItems)
        .where(eq(orderItems.orderId, args.orderId));
      const emailInput: OrderEmailInput = {
        orderNumber: orderRow.orderNumber,
        status: args.next,
        recipientName: orderRow.recipientName,
        email: orderRow.email,
        fulfillmentMethod: orderRow.fulfillmentMethod,
        lines: await toEmailLines(items),
        subtotalCentavos: orderRow.subtotalCentavos,
        discountCentavos: orderRow.discountCentavos,
        deliveryFeeCentavos: orderRow.deliveryFeeCentavos,
        totalCentavos: orderRow.totalCentavos,
        orderedAt: orderRow.createdAt,
        reason: args.reason,
        pickupNotes: orderRow.pickupNotes,
        testerAwarded: args.next === "CONFIRMED" ? await loadTesterAwarded(orderRow.promoTesterSkuId) : null,
      };

      const r = await sendEmail({ to: orderRow.email, ...entry.build(emailInput) });
      await client.insert(notificationLog).values({
        orderId: args.orderId,
        recipient: orderRow.email,
        template: entry.template,
        status: r.ok ? "SENT" : "FAILED",
        error: r.ok ? null : r.error ?? "unknown error",
      });
    } catch (error) {
      // Status change already committed; this must not surface as a failure
      // to the caller. But previously it also left zero trace — a throw
      // anywhere above (building the email input, an unexpected sendEmail
      // rejection) skipped the notificationLog insert entirely, so a status
      // email could silently never send with no record it was even
      // attempted. Log and record it as FAILED instead, best-effort.
      console.error(`Failed to send ${entry.template} email for order ${args.orderId}`, error);
      await client
        .insert(notificationLog)
        .values({
          orderId: args.orderId,
          recipient: orderRow.email,
          template: entry.template,
          status: "FAILED",
          error: error instanceof Error ? error.message : "unknown error",
        })
        .catch(() => {
          // Even the audit-trail insert failed; nothing more to do from a
          // fire-and-forget after() callback.
        });
    }
  });
}

export interface RequestCancellationInput {
  orderId: string;
  userId: string;
  reason: string;
}

/** Customer asks to cancel a CONFIRMED order (see customerCancelMode in
 *  src/domain/order-state.ts) — sets a pending flag rather than cancelling
 *  immediately; an admin must approve or deny it
 *  (resolveCancellationRequest). */
export async function requestOrderCancellation(args: RequestCancellationInput): Promise<void> {
  const client = db();
  const orderRow = await client.transaction(async (tx) => {
    const row = (
      await tx
        .select()
        .from(orders)
        .where(and(eq(orders.id, args.orderId), eq(orders.userId, args.userId)))
        .for("update")
    )[0];
    if (!row) throw new Error("Order not found");
    if (customerCancelMode(row.status) !== "REQUEST") {
      throw new Error("This order can't have a cancellation requested right now");
    }
    if (row.cancellationRequestedAt) {
      throw new Error("A cancellation request is already pending for this order");
    }
    await tx
      .update(orders)
      .set({ cancellationRequestedAt: new Date(), cancellationRequestReason: args.reason, updatedAt: new Date() })
      .where(eq(orders.id, args.orderId));
    return row;
  });

  after(async () => {
    try {
      const env = getEnv();
      const emailInput: OrderEmailInput = {
        orderNumber: orderRow.orderNumber,
        status: "CONFIRMED",
        recipientName: orderRow.recipientName,
        email: orderRow.email,
        fulfillmentMethod: orderRow.fulfillmentMethod,
        lines: await toEmailLines(await client.select().from(orderItems).where(eq(orderItems.orderId, args.orderId))),
        subtotalCentavos: orderRow.subtotalCentavos,
        discountCentavos: orderRow.discountCentavos,
        deliveryFeeCentavos: orderRow.deliveryFeeCentavos,
        totalCentavos: orderRow.totalCentavos,
        orderedAt: orderRow.createdAt,
        reason: args.reason,
        pickupNotes: orderRow.pickupNotes,
      };
      const [customerResult, adminResult] = await Promise.all([
        sendEmail({ to: orderRow.email, ...cancellationRequestedEmail(emailInput) }),
        sendEmail({ to: env.ADMIN_EMAIL, ...adminCancellationRequestNotification(emailInput) }),
      ]);
      await client.insert(notificationLog).values([
        {
          orderId: args.orderId,
          recipient: orderRow.email,
          template: "cancellation_requested",
          status: customerResult.ok ? "SENT" : "FAILED",
          error: customerResult.ok ? null : customerResult.error ?? "unknown error",
        },
        {
          orderId: args.orderId,
          recipient: env.ADMIN_EMAIL,
          template: "admin_cancellation_request",
          status: adminResult.ok ? "SENT" : "FAILED",
          error: adminResult.ok ? null : adminResult.error ?? "unknown error",
        },
      ]);
    } catch (error) {
      console.error(`Failed to send cancellation-request emails for order ${args.orderId}`, error);
      await client
        .insert(notificationLog)
        .values({
          orderId: args.orderId,
          recipient: orderRow.email,
          template: "cancellation_requested",
          status: "FAILED",
          error: error instanceof Error ? error.message : "unknown error",
        })
        .catch(() => {
          // Even the audit-trail insert failed; nothing more to do from a
          // fire-and-forget after() callback.
        });
    }
  });
}

/** Admin approves (-> CANCELLED, via transitionOrderStatus, which also
 *  releases stock/promo and sends the usual cancellation email) or denies
 *  (order stays as-is, a separate email explains) a pending cancellation
 *  request. */
export async function resolveCancellationRequest(args: {
  orderId: string;
  decision: "APPROVED" | "DENIED";
}): Promise<void> {
  const client = db();

  if (args.decision === "APPROVED") {
    const row = (await client.select().from(orders).where(eq(orders.id, args.orderId)))[0];
    if (!row) throw new Error("Order not found");
    if (!row.cancellationRequestedAt) throw new Error("No pending cancellation request for this order");
    await transitionOrderStatus({
      orderId: args.orderId,
      next: "CANCELLED",
      reason: row.cancellationRequestReason ?? "Cancellation request approved",
    });
    return;
  }

  const orderRow = await client.transaction(async (tx) => {
    const row = (await tx.select().from(orders).where(eq(orders.id, args.orderId)).for("update"))[0];
    if (!row) throw new Error("Order not found");
    if (!row.cancellationRequestedAt) throw new Error("No pending cancellation request for this order");
    await tx
      .update(orders)
      .set({ cancellationRequestedAt: null, cancellationRequestReason: null, updatedAt: new Date() })
      .where(eq(orders.id, args.orderId));
    return row;
  });

  after(async () => {
    try {
      const emailInput: OrderEmailInput = {
        orderNumber: orderRow.orderNumber,
        status: "CONFIRMED",
        recipientName: orderRow.recipientName,
        email: orderRow.email,
        fulfillmentMethod: orderRow.fulfillmentMethod,
        lines: await toEmailLines(await client.select().from(orderItems).where(eq(orderItems.orderId, args.orderId))),
        subtotalCentavos: orderRow.subtotalCentavos,
        discountCentavos: orderRow.discountCentavos,
        deliveryFeeCentavos: orderRow.deliveryFeeCentavos,
        totalCentavos: orderRow.totalCentavos,
        orderedAt: orderRow.createdAt,
        reason: orderRow.cancellationRequestReason,
        pickupNotes: orderRow.pickupNotes,
      };
      const r = await sendEmail({ to: orderRow.email, ...cancellationRequestDeniedEmail(emailInput) });
      await client.insert(notificationLog).values({
        orderId: args.orderId,
        recipient: orderRow.email,
        template: "cancellation_request_denied",
        status: r.ok ? "SENT" : "FAILED",
        error: r.ok ? null : r.error ?? "unknown error",
      });
    } catch (error) {
      console.error(`Failed to send cancellation-request-denied email for order ${args.orderId}`, error);
      await client
        .insert(notificationLog)
        .values({
          orderId: args.orderId,
          recipient: orderRow.email,
          template: "cancellation_request_denied",
          status: "FAILED",
          error: error instanceof Error ? error.message : "unknown error",
        })
        .catch(() => {
          // Even the audit-trail insert failed; nothing more to do from a
          // fire-and-forget after() callback.
        });
    }
  });
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
