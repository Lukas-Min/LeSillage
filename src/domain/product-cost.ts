import type { Fulfillment, ProductType, Provenance } from "@/db/schema";
import { isArchivedProduct } from "./product-archive";

export interface CostCheckProduct {
  id: string;
  brand: string;
  name: string;
  type: ProductType;
  isActive: boolean;
  costPrice: number | null;
}

export interface CostCheckSku {
  productId: string;
  isActive: boolean;
  provenance: Provenance;
  costPrice: number;
  fulfillment: Fulfillment;
  stock: number;
}

/**
 * Products whose cost hasn't been set, so a sale of them would count as pure
 * profit. Most products carry one cost on the product itself (every size's
 * cost is scaled from it); a retail decant is bought ready-made and carries
 * its own cost on the size instead. Archived products are left out.
 */
export function productsMissingCost(
  products: readonly CostCheckProduct[],
  skus: readonly CostCheckSku[],
): CostCheckProduct[] {
  const byProduct = new Map<string, CostCheckSku[]>();
  for (const sku of skus) {
    const list = byProduct.get(sku.productId);
    if (list) list.push(sku);
    else byProduct.set(sku.productId, [sku]);
  }
  return products
    .filter((product) => {
      const own = byProduct.get(product.id) ?? [];
      if (isArchivedProduct(product, own)) return false;
      const retailDecants = product.type === "DECANT" ? own.filter((sku) => sku.provenance === "RETAIL") : [];
      const productLevel = product.type !== "DECANT" || own.length === 0 || own.length > retailDecants.length;
      const productMissing = productLevel && (product.costPrice ?? 0) <= 0;
      const retailMissing = retailDecants.some((sku) => sku.isActive && sku.costPrice <= 0);
      return productMissing || retailMissing;
    })
    .sort(
      (a, b) =>
        a.brand.localeCompare(b.brand, undefined, { sensitivity: "base" }) ||
        a.name.localeCompare(b.name, undefined, { sensitivity: "base" }),
    );
}
