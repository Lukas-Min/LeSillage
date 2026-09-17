import {
  DECANT_PROMO_THRESHOLD_CENTAVOS,
  DEFAULT_DELIVERY_FEE_CENTAVOS,
} from "./money";
import type { DiscountType, ProductType, TesterResult } from "@/db/schema";

export interface SiteWideDiscountConfig {
  enabled: boolean;
  type: DiscountType;
  amount: number;
}

export interface PromoConfig {
  decantThresholdCentavos: number;
  deliveryFeeCentavos: number;
  freeDeliveryEnabled: boolean;
  testerBonusEnabled: boolean;
  siteWideDiscount: SiteWideDiscountConfig;
}

export const DEFAULT_PROMO_CONFIG: PromoConfig = {
  decantThresholdCentavos: DECANT_PROMO_THRESHOLD_CENTAVOS,
  deliveryFeeCentavos: DEFAULT_DELIVERY_FEE_CENTAVOS,
  freeDeliveryEnabled: true,
  testerBonusEnabled: true,
  siteWideDiscount: { enabled: false, type: "PERCENTAGE", amount: 0 },
};

export interface CartLineForPromo {
  productType: ProductType;
  discountedLineTotalCentavos: number;
}

export function decantSubtotal(lines: CartLineForPromo[]): number {
  return lines
    .filter((line) => line.productType === "DECANT")
    .reduce((sum, line) => sum + line.discountedLineTotalCentavos, 0);
}

export function isFreeShippingEligible(
  lines: CartLineForPromo[],
  config: PromoConfig = DEFAULT_PROMO_CONFIG,
): boolean {
  if (!config.freeDeliveryEnabled) return false;
  return decantSubtotal(lines) >= config.decantThresholdCentavos;
}

export function isTesterBonusEligible(
  lines: CartLineForPromo[],
  config: PromoConfig = DEFAULT_PROMO_CONFIG,
): boolean {
  if (!config.testerBonusEnabled) return false;
  return decantSubtotal(lines) >= config.decantThresholdCentavos;
}

export interface TesterAssignment {
  result: TesterResult;
  skuId: string | null;
}

export interface TesterCandidate {
  skuId: string;
  brand: string;
  stock: number;
}

/**
 * How many free-tester units a tester SKU can hand out right now. A tester is
 * a decant, so this follows the same provenance split as the cart: an
 * IN_HOUSE decant is poured from the product's shared ml pool (one unit per
 * `sizeMl`), a RETAIL one is a distinct pre-made unit with its own stock.
 */
export function testerUnitsAvailable(sku: {
  provenance: string;
  stock: number;
  sizeMl: number | null;
  remainingMl: number | null;
}): number {
  if (sku.provenance === "IN_HOUSE") {
    const size = sku.sizeMl ?? 0;
    if (size <= 0) return 0;
    return Math.floor(Math.max(0, sku.remainingMl ?? 0) / size);
  }
  return Math.max(0, sku.stock);
}

export function pickTester(
  candidates: TesterCandidate[],
  purchasedBrands: Set<string>,
  random: () => number = Math.random,
): TesterAssignment {
  const pool = candidates.filter((c) => c.stock > 0 && purchasedBrands.has(c.brand));

  if (pool.length === 0) {
    return { result: "PENDING", skuId: null };
  }

  const index = Math.min(pool.length - 1, Math.floor(random() * pool.length));
  return { result: "ASSIGNED", skuId: pool[index].skuId };
}
