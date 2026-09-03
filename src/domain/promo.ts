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
  family: string | null;
  brand: string;
  stock: number;
}

export function pickTester(
  candidates: TesterCandidate[],
  purchasedFamilies: Set<string>,
  purchasedBrands: Set<string>,
  random: () => number = Math.random,
): TesterAssignment {
  const matchingFamily = candidates.filter(
    (c) => c.stock > 0 && c.family && purchasedFamilies.has(c.family),
  );
  const familyPool = matchingFamily.length > 0 ? matchingFamily : candidates.filter(
    (c) => c.stock > 0 && purchasedBrands.has(c.brand),
  );
  const pool = familyPool.length > 0 ? familyPool : candidates.filter((c) => c.stock > 0);

  if (pool.length === 0) {
    return { result: "PENDING", skuId: null };
  }

  const index = Math.min(pool.length - 1, Math.floor(random() * pool.length));
  return { result: "ASSIGNED", skuId: pool[index].skuId };
}