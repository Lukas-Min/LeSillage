import { cookies } from "next/headers";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db/client";
import {
  carts,
  cartItems,
  products,
  productDiscounts,
  promoSettings,
  skus,
  type Fulfillment,
  type FulfillmentMethod,
  type ProductType,
} from "@/db/schema";
import { auth } from "@/auth";
import { priceCart } from "@/domain/cart";
import { buildCartTotals, type CheckoutTotals } from "@/domain/checkout-totals";
import { clampQuantity } from "@/domain/money";
import { DEFAULT_PROMO_CONFIG, type PromoConfig } from "@/domain/promo";
import { DECANT_SIZES_ML, decantFulfillment, DEFAULT_DECANT_PREORDER_THRESHOLD_ML } from "@/domain/decant";

export const GUEST_CART_COOKIE = "le-sillage-guest-cart";

export interface CartLineView {
  skuId: string;
  name: string;
  skuLabel: string;
  retailPriceCentavos: number;
  originalUnitCentavos: number;
  fulfillment: Fulfillment;
  productType: ProductType;
  quantity: number;
  maxQuantity: number;
}

export interface CartView {
  items: CartLineView[];
  count: number;
  totals: CheckoutTotals;
}

export async function loadPromoConfig(): Promise<PromoConfig & { decantPreOrderThresholdMl: number }> {
  const row = (await db().select().from(promoSettings).where(eq(promoSettings.id, "singleton")))[0];
  return {
    decantThresholdCentavos: row?.decantThresholdCentavos ?? DEFAULT_PROMO_CONFIG.decantThresholdCentavos,
    deliveryFeeCentavos: row?.deliveryFeeCentavos ?? DEFAULT_PROMO_CONFIG.deliveryFeeCentavos,
    freeDeliveryEnabled: row?.freeDeliveryEnabled ?? DEFAULT_PROMO_CONFIG.freeDeliveryEnabled,
    testerBonusEnabled: row?.testerBonusEnabled ?? DEFAULT_PROMO_CONFIG.testerBonusEnabled,
    decantPreOrderThresholdMl: row?.decantPreOrderThresholdMl ?? DEFAULT_DECANT_PREORDER_THRESHOLD_ML,
  };
}

export async function resolveActiveCart() {
  const session = await auth();
  if (session?.user?.id) {
    const cart = await getOrCreateCartForUser(session.user.id);
    return { cart, isGuest: false, subject: session.user.id };
  }
  const { cart, token } = await getOrCreateGuestCart();
  return { cart, isGuest: true, subject: token };
}

export async function getOrCreateCartForUser(userId: string) {
  const client = db();
  const existing = (await client.select().from(carts).where(eq(carts.userId, userId)))[0];
  if (existing) return existing;
  return (await client.insert(carts).values({ userId }).returning())[0];
}

export async function getOrCreateGuestCart(): Promise<{
  token: string;
  cart: typeof carts.$inferSelect;
}> {
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

export function effectiveFulfillment(args: {
  productType: ProductType;
  skuFulfillment: Fulfillment;
  sizeMl: number | null;
  remainingMl: number | null;
  thresholdMl: number;
}): Fulfillment {
  if (args.productType !== "DECANT") return args.skuFulfillment;
  return decantFulfillment({
    remainingMl: args.remainingMl ?? 0,
    sizeMl: args.sizeMl ?? DECANT_SIZES_ML[0],
    thresholdMl: args.thresholdMl,
  });
}

export async function addOneToCart(
  cart: { id: string },
  sku: typeof skus.$inferSelect & { productType?: ProductType; remainingMl?: number | null },
  quantity: number,
  thresholdMl: number,
) {
  const client = db();
  const productType = sku.productType ?? "FULL_BOTTLE";
  const fulfillment = effectiveFulfillment({
    productType,
    skuFulfillment: sku.fulfillment,
    sizeMl: sku.sizeMl,
    remainingMl: sku.remainingMl ?? null,
    thresholdMl,
  });
  const cap = productType === "DECANT" || fulfillment === "PRE_ORDER" ? 99 : sku.stock;
  const clamped = clampQuantity(quantity, Math.max(cap, 1));
  const existing = (
    await client
      .select()
      .from(cartItems)
      .where(and(eq(cartItems.cartId, cart.id), eq(cartItems.skuId, sku.id)))
  )[0];
  if (existing) {
    const next = clampQuantity(existing.quantity + clamped, Math.max(cap, 1));
    await client.update(cartItems).set({ quantity: next }).where(eq(cartItems.id, existing.id));
  } else {
    await client.insert(cartItems).values({ cartId: cart.id, skuId: sku.id, quantity: clamped });
  }
}

export async function loadCartView(
  cartId: string,
  fulfillmentMethod: FulfillmentMethod = "DELIVERY",
): Promise<CartView> {
  const client = db();
  const items = await client.select().from(cartItems).where(eq(cartItems.cartId, cartId));
  if (items.length === 0) {
    const promoConfig = await loadPromoConfig();
    return {
      items: [],
      count: 0,
      totals: buildCartTotals(
        {
          lines: [],
          merchandiseSubtotalCentavos: 0,
          discountCentavos: 0,
          deliveryFeeCentavos: 0,
          totalCentavos: 0,
          purchasedBrands: new Set(),
          purchasedFamilies: new Set(),
          decantSubtotalCentavos: 0,
        },
        promoConfig,
        fulfillmentMethod,
      ),
    };
  }
  const skuRows = await client
    .select({
      sku: skus,
      productType: products.type,
      productBrand: products.brand,
      productFamily: products.family,
      productName: products.name,
      remainingMl: products.remainingMl,
    })
    .from(skus)
    .innerJoin(products, eq(products.id, skus.productId))
    .where(inArray(skus.id, items.map((item) => item.skuId)));
  const discounts = await client
    .select()
    .from(productDiscounts)
    .where(inArray(productDiscounts.productId, Array.from(new Set(skuRows.map((row) => row.sku.productId)))));
  const promoConfig = await loadPromoConfig();
  const pricedInputs = items.flatMap((item) => {
    const found = skuRows.find((row) => row.sku.id === item.skuId);
    if (!found || !found.sku.isActive) return [];
    const fulfillment = effectiveFulfillment({
      productType: found.productType,
      skuFulfillment: found.sku.fulfillment,
      sizeMl: found.sku.sizeMl,
      remainingMl: found.remainingMl,
      thresholdMl: promoConfig.decantPreOrderThresholdMl,
    });
    return [
      {
        sku: { ...found.sku, fulfillment },
        quantity: item.quantity,
        productType: found.productType,
        productBrand: found.productBrand,
        productFamily: found.productFamily,
        discounts: discounts.filter((d) => d.productId === found.sku.productId),
      },
    ];
  });
  const priced = priceCart(pricedInputs, {
    deliveryFeeCentavos: promoConfig.deliveryFeeCentavos,
    freeShipping: false,
  });
  const totals = buildCartTotals(priced, promoConfig, fulfillmentMethod);
  const lines: CartLineView[] = priced.lines.map((line) => {
    const found = skuRows.find((row) => row.sku.id === line.skuId);
    const cap =
      line.productType === "DECANT" || line.fulfillment === "PRE_ORDER"
        ? 99
        : Math.max(found?.sku.stock ?? 1, 1);
    return {
      skuId: line.skuId,
      name: found?.productName ?? "Fragrance",
      skuLabel: found?.sku.label ?? "",
      retailPriceCentavos: line.discountedUnitCentavos,
      originalUnitCentavos: line.unitPriceCentavos,
      fulfillment: line.fulfillment,
      productType: line.productType,
      quantity: line.quantity,
      maxQuantity: cap,
    };
  });
  return {
    items: lines,
    count: lines.reduce((sum, line) => sum + line.quantity, 0),
    totals,
  };
}

export async function mergeGuestCartIntoUser(): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) return;
  const store = await cookies();
  const token = store.get(GUEST_CART_COOKIE)?.value;
  if (!token) return;
  const client = db();
  const userCart = await getOrCreateCartForUser(session.user.id);
  const guestCart = (await client.select().from(carts).where(eq(carts.guestToken, token)))[0];
  if (!guestCart) return;
  const guestItems = await client.select().from(cartItems).where(eq(cartItems.cartId, guestCart.id));
  const promoConfig = await loadPromoConfig();
  if (guestItems.length > 0) {
    const skuRows = await client
      .select({ sku: skus, productType: products.type, remainingMl: products.remainingMl })
      .from(skus)
      .innerJoin(products, eq(products.id, skus.productId))
      .where(inArray(skus.id, guestItems.map((item) => item.skuId)));
    for (const item of guestItems) {
      const found = skuRows.find((row) => row.sku.id === item.skuId);
      if (!found || !found.sku.isActive) continue;
      await addOneToCart(
        userCart,
        { ...found.sku, productType: found.productType, remainingMl: found.remainingMl },
        item.quantity,
        promoConfig.decantPreOrderThresholdMl,
      );
    }
  }
  await client.delete(cartItems).where(eq(cartItems.cartId, guestCart.id));
  await client.delete(carts).where(eq(carts.id, guestCart.id));
  store.delete(GUEST_CART_COOKIE);
}

export async function importLegacyCartLines(lines: Array<{ skuId: string; quantity: number }>) {
  const { cart } = await resolveActiveCart();
  const promoConfig = await loadPromoConfig();
  const client = db();
  if (lines.length === 0) return loadCartView(cart.id);
  const skuRows = await client
    .select({ sku: skus, productType: products.type, remainingMl: products.remainingMl })
    .from(skus)
    .innerJoin(products, eq(products.id, skus.productId))
    .where(inArray(skus.id, lines.map((line) => line.skuId)));
  for (const line of lines) {
    const found = skuRows.find((row) => row.sku.id === line.skuId);
    if (!found || !found.sku.isActive) continue;
    await addOneToCart(
      cart,
      { ...found.sku, productType: found.productType, remainingMl: found.remainingMl },
      line.quantity,
      promoConfig.decantPreOrderThresholdMl,
    );
  }
  return loadCartView(cart.id);
}
