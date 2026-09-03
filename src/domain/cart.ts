import { applyLineDiscount, bestDiscount } from "./discount";
import type {
  Fulfillment,
  ProductDiscount,
  ProductType,
  Sku,
} from "@/db/schema";

export interface CartSkuInput {
  sku: Pick<Sku, "id" | "fulfillment" | "retailPrice">;
  quantity: number;
  productType: ProductType;
  productBrand?: string | null;
  productFamily?: string | null;
  discounts?: ProductDiscount[];
}

export interface PricedLine {
  skuId: string;
  productType: ProductType;
  fulfillment: Fulfillment;
  brand: string | null;
  family: string | null;
  quantity: number;
  unitPriceCentavos: number;
  discountedUnitCentavos: number;
  lineSubtotalCentavos: number;
  lineDiscountCentavos: number;
}

export interface CartTotals {
  lines: PricedLine[];
  merchandiseSubtotalCentavos: number;
  discountCentavos: number;
  deliveryFeeCentavos: number;
  totalCentavos: number;
  purchasedBrands: Set<string>;
  purchasedFamilies: Set<string>;
  decantSubtotalCentavos: number;
}

export interface PricingOptions {
  deliveryFeeCentavos: number;
  freeShipping: boolean;
}

export function priceCart(
  items: CartSkuInput[],
  options: PricingOptions,
  now: Date = new Date(),
): CartTotals {
  const lines: PricedLine[] = [];
  let merchandiseSubtotalCentavos = 0;
  let totalDiscountCentavos = 0;
  let decantSubtotal = 0;
  const purchasedBrands = new Set<string>();
  const purchasedFamilies = new Set<string>();

  for (const item of items) {
    if (item.quantity <= 0) continue;
    const unitPriceCentavos = item.sku.retailPrice;
    const discount = bestDiscount(item.discounts ?? [], unitPriceCentavos, item.quantity, now);
    const { lineSubtotalCentavos: lineSubtotal, lineDiscountCentavos: lineDiscount } = applyLineDiscount(
      unitPriceCentavos,
      item.quantity,
      discount,
    );
    const discountedUnitCentavos = Math.round(lineSubtotal / item.quantity);
    lines.push({
      skuId: item.sku.id,
      productType: item.productType,
      fulfillment: item.sku.fulfillment,
      brand: item.productBrand ?? null,
      family: item.productFamily ?? null,
      quantity: item.quantity,
      unitPriceCentavos,
      discountedUnitCentavos,
      lineSubtotalCentavos: lineSubtotal,
      lineDiscountCentavos: lineDiscount,
    });
    merchandiseSubtotalCentavos += lineSubtotal;
    totalDiscountCentavos += lineDiscount;
    if (item.productType === "DECANT") {
      decantSubtotal += lineSubtotal;
    }
    if (item.productBrand) purchasedBrands.add(item.productBrand);
    if (item.productFamily) purchasedFamilies.add(item.productFamily);
  }

  const deliveryFeeCentavos = options.freeShipping ? 0 : options.deliveryFeeCentavos;
  const totalCentavos = merchandiseSubtotalCentavos + deliveryFeeCentavos;

  return {
    lines,
    merchandiseSubtotalCentavos,
    discountCentavos: totalDiscountCentavos,
    deliveryFeeCentavos,
    totalCentavos,
    purchasedBrands,
    purchasedFamilies,
    decantSubtotalCentavos: decantSubtotal,
  };
}
