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
import { priceCart, type CartTotals } from "@/domain/cart";
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
  /** False when this SKU was deactivated after being added — excluded from
   *  totals/checkout, shown with a "no longer available" notice instead of
   *  silently vanishing from the cart. */
  available: boolean;
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

/**
 * The real max purchasable quantity for one cart line — replaces the old
 * flat-99-for-any-decant-or-preorder rule, which let someone cart more ml
 * than a decant bottle could ever contain. An ON_HAND decant is capped by
 * what its shared `remainingMl` pool can actually yield at that size; a
 * PRE_ORDER decant (not enough on hand right now) stays uncapped-ish at 99
 * since that's a future restock, not bounded by today's remainingMl. A
 * non-decant, non-preorder item is capped by its own `stock` — including
 * `stock === 0`, which callers must treat as "cannot add" (see callers:
 * clampQuantity floors to 1 regardless of max, so a cap of 0 must be
 * checked and rejected *before* calling it, not passed through).
 */
export function resolveCartCap(args: {
  productType: ProductType;
  fulfillment: Fulfillment;
  sizeMl: number | null;
  remainingMl: number | null | undefined;
  stock: number;
}): number {
  if (args.productType === "DECANT") {
    if (args.fulfillment !== "ON_HAND") return 99;
    // Same null-sizeMl fallback as effectiveFulfillment below, so the two
    // never disagree on whether a SKU with no sizeMl is available.
    const size = args.sizeMl ?? DECANT_SIZES_ML[0];
    if (size <= 0) return 0;
    return Math.max(0, Math.floor((args.remainingMl ?? 0) / size));
  }
  if (args.fulfillment === "PRE_ORDER") return 99;
  return Math.max(0, args.stock);
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
  const cap = resolveCartCap({ productType, fulfillment, sizeMl: sku.sizeMl, remainingMl: sku.remainingMl, stock: sku.stock });
  if (cap <= 0) throw new Error("This item is currently out of stock");
  const clamped = clampQuantity(quantity, cap);
  const existing = (
    await client
      .select()
      .from(cartItems)
      .where(and(eq(cartItems.cartId, cart.id), eq(cartItems.skuId, sku.id)))
  )[0];
  if (existing) {
    const next = clampQuantity(existing.quantity + clamped, cap);
    await client.update(cartItems).set({ quantity: next }).where(eq(cartItems.id, existing.id));
  } else {
    await client.insert(cartItems).values({ cartId: cart.id, skuId: sku.id, quantity: clamped });
  }
}

interface PricedCart {
  lines: CartLineView[];
  unavailableLines: CartLineView[];
  priced: CartTotals;
  promoConfig: PromoConfig & { decantPreOrderThresholdMl: number };
}

/**
 * The DB-fetching + pricing portion of loadCartView, split out so a caller
 * that needs totals for more than one fulfillment method (checkout, which
 * shows both delivery and pickup totals side by side) doesn't pay for the
 * query and pricing work twice — buildCartTotals's `priced` input doesn't
 * depend on fulfillmentMethod at all, only the totals math built from it
 * does. See loadCartView and loadCartViewForBothMethods below.
 */
async function loadPricedCart(
  cartId: string,
  preloadedPromoConfig?: PromoConfig & { decantPreOrderThresholdMl: number },
): Promise<PricedCart> {
  const client = db();
  const [items, promoConfig] = await Promise.all([
    client.select().from(cartItems).where(eq(cartItems.cartId, cartId)),
    preloadedPromoConfig ?? loadPromoConfig(),
  ]);
  if (items.length === 0) {
    return {
      lines: [],
      unavailableLines: [],
      priced: {
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
  const lines: CartLineView[] = priced.lines.map((line) => {
    const found = skuRows.find((row) => row.sku.id === line.skuId);
    const cap = resolveCartCap({
      productType: line.productType,
      fulfillment: line.fulfillment,
      sizeMl: found?.sku.sizeMl ?? null,
      remainingMl: found?.remainingMl,
      stock: found?.sku.stock ?? 0,
    });
    return {
      skuId: line.skuId,
      name: found?.productName ?? "Fragrance",
      skuLabel: found?.sku.label ?? "",
      retailPriceCentavos: line.discountedUnitCentavos,
      originalUnitCentavos: line.unitPriceCentavos,
      fulfillment: line.fulfillment,
      productType: line.productType,
      quantity: line.quantity,
      maxQuantity: Math.max(cap, 0),
      available: true,
    };
  });
  // Items whose SKU was deactivated after being added — kept visible with a
  // "no longer available" notice instead of vanishing with no explanation.
  // Excluded from totals/checkout (priced.lines/buildCartTotals above never
  // saw them, since pricedInputs filters them out).
  const unavailableLines: CartLineView[] = items.flatMap((item) => {
    const found = skuRows.find((row) => row.sku.id === item.skuId);
    if (found && found.sku.isActive) return [];
    return [
      {
        skuId: item.skuId,
        name: found?.productName ?? "This item",
        skuLabel: found?.sku.label ?? "",
        retailPriceCentavos: 0,
        originalUnitCentavos: 0,
        fulfillment: found?.sku.fulfillment ?? "ON_HAND",
        productType: found?.productType ?? "DECANT",
        quantity: item.quantity,
        maxQuantity: 0,
        available: false,
      },
    ];
  });
  return { lines, unavailableLines, priced, promoConfig };
}

export async function loadCartView(
  cartId: string,
  fulfillmentMethod: FulfillmentMethod = "DELIVERY",
  // Callers that already fetched promo config for their own cap/fulfillment
  // calculations (addItemToCart, updateCartItem, changeCartItemSize) can
  // pass it through to skip a second, identical round trip here.
  preloadedPromoConfig?: PromoConfig & { decantPreOrderThresholdMl: number },
): Promise<CartView> {
  const { lines, unavailableLines, priced, promoConfig } = await loadPricedCart(cartId, preloadedPromoConfig);
  return {
    items: [...lines, ...unavailableLines],
    count: lines.reduce((sum, line) => sum + line.quantity, 0),
    totals: buildCartTotals(priced, promoConfig, fulfillmentMethod),
  };
}

/**
 * Checkout shows delivery and pickup totals side by side — this fetches and
 * prices the cart once and computes both, instead of checkout calling
 * loadCartView twice (which used to mean two full DB fetches and two
 * priceCart passes for numbers that only differ in a cheap in-memory step).
 */
export async function loadCartViewForBothMethods(
  cartId: string,
  preloadedPromoConfig?: PromoConfig & { decantPreOrderThresholdMl: number },
): Promise<{
  items: CartLineView[];
  count: number;
  deliveryTotals: CheckoutTotals;
  pickupTotals: CheckoutTotals;
}> {
  const { lines, unavailableLines, priced, promoConfig } = await loadPricedCart(cartId, preloadedPromoConfig);
  return {
    items: [...lines, ...unavailableLines],
    count: lines.reduce((sum, line) => sum + line.quantity, 0),
    deliveryTotals: buildCartTotals(priced, promoConfig, "DELIVERY"),
    pickupTotals: buildCartTotals(priced, promoConfig, "PICKUP"),
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
    // Each item targets a distinct skuId (unique per cart), so these don't
    // contend with each other — safe to run concurrently instead of one
    // sequential round trip per item (this runs on every sign-in that has a
    // guest cart to merge). Each write is caught individually so one item
    // failing (e.g. it just went out of stock) can't abort the others that
    // already succeeded, and can't skip the guest-cart cleanup below —
    // leaving already-merged items duplicated in the guest cart for a retry
    // to re-add.
    await Promise.all(
      guestItems.map(async (item) => {
        const found = skuRows.find((row) => row.sku.id === item.skuId);
        if (!found || !found.sku.isActive) return;
        try {
          await addOneToCart(
            userCart,
            { ...found.sku, productType: found.productType, remainingMl: found.remainingMl },
            item.quantity,
            promoConfig.decantPreOrderThresholdMl,
          );
        } catch {
          // Best-effort merge — leave this item behind rather than fail the batch.
        }
      }),
    );
  }
  await client.delete(cartItems).where(eq(cartItems.cartId, guestCart.id));
  await client.delete(carts).where(eq(carts.id, guestCart.id));
  store.delete(GUEST_CART_COOKIE);
}

export interface GuestCartMergeState {
  hasConflict: boolean;
  guestCount: number;
  userCount: number;
}

/**
 * Call right after sign-in, before merging. If both the guest cart and the
 * account's existing cart already have items, the caller must ask the user
 * which to keep (see resolveGuestCartConflict) instead of silently combining
 * quantities — auto-merging here would surprise someone who deliberately has
 * different items staged as a guest and on their account.
 */
export async function checkGuestCartMerge(): Promise<GuestCartMergeState> {
  const empty: GuestCartMergeState = { hasConflict: false, guestCount: 0, userCount: 0 };
  const session = await auth();
  if (!session?.user?.id) return empty;
  const store = await cookies();
  const token = store.get(GUEST_CART_COOKIE)?.value;
  if (!token) return empty;
  const client = db();
  const [guestCart, userCart] = await Promise.all([
    client.select().from(carts).where(eq(carts.guestToken, token)).then((r) => r[0]),
    getOrCreateCartForUser(session.user.id),
  ]);
  if (!guestCart) return empty;
  const [guestItems, userItems] = await Promise.all([
    client.select({ quantity: cartItems.quantity }).from(cartItems).where(eq(cartItems.cartId, guestCart.id)),
    client.select({ quantity: cartItems.quantity }).from(cartItems).where(eq(cartItems.cartId, userCart.id)),
  ]);
  const guestCount = guestItems.reduce((sum, item) => sum + item.quantity, 0);
  const userCount = userItems.reduce((sum, item) => sum + item.quantity, 0);
  return { hasConflict: guestItems.length > 0 && userItems.length > 0, guestCount, userCount };
}

/**
 * Resolves a guest-vs-account cart conflict the user was asked about:
 * "keep-account" discards the guest cart untouched; "use-guest" replaces the
 * account cart's contents with the guest cart's. Replacing re-parents the
 * guest cart's rows onto the account cart in one UPDATE (the account cart is
 * emptied first in the same transaction, so the (cartId, skuId) unique index
 * can't collide) rather than re-adding each item one at a time — faster, and
 * this runs on the sign-in critical path.
 */
export async function resolveGuestCartConflict(strategy: "keep-account" | "use-guest"): Promise<CartView> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Please sign in");
  const store = await cookies();
  const token = store.get(GUEST_CART_COOKIE)?.value;
  const userCart = await getOrCreateCartForUser(session.user.id);
  if (token) {
    const client = db();
    const guestCart = (await client.select().from(carts).where(eq(carts.guestToken, token)))[0];
    if (guestCart) {
      if (strategy === "use-guest") {
        await client.transaction(async (tx) => {
          await tx.delete(cartItems).where(eq(cartItems.cartId, userCart.id));
          await tx.update(cartItems).set({ cartId: userCart.id }).where(eq(cartItems.cartId, guestCart.id));
        });
      } else {
        await client.delete(cartItems).where(eq(cartItems.cartId, guestCart.id));
      }
      await client.delete(carts).where(eq(carts.id, guestCart.id));
    }
    store.delete(GUEST_CART_COOKIE);
  }
  return loadCartView(userCart.id);
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
  // Same reasoning as mergeGuestCartIntoUser above — distinct skuIds, safe
  // to run concurrently rather than one sequential round trip per line, each
  // write caught individually so one failing item can't abort the rest.
  await Promise.all(
    lines.map(async (line) => {
      const found = skuRows.find((row) => row.sku.id === line.skuId);
      if (!found || !found.sku.isActive) return;
      try {
        await addOneToCart(
          cart,
          { ...found.sku, productType: found.productType, remainingMl: found.remainingMl },
          line.quantity,
          promoConfig.decantPreOrderThresholdMl,
        );
      } catch {
        // Best-effort import — leave this line behind rather than fail the batch.
      }
    }),
  );
  return loadCartView(cart.id);
}
