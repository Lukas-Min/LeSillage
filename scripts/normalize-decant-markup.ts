/**
 * Normalizes every DECANT product to a uniform 30% markup over its original
 * (wholesale/discounted) cost, across every size (3/5/10/30ml).
 *
 * Fixes the known inconsistency documented in import-decant-pricelist.ts:
 * that importer hardcoded each SKU's retail price straight from the real
 * pricelist, which carries 0% markup on 5ml and ~30% markup on 3/10/30ml
 * (5ml = raw per-ml rate off the Discounted Full Bottle Price; 3/10/30ml =
 * that same rate × 1.3). Its product-level costPrice/pricingMode/pricingInput
 * were cost-basis bookkeeping only (set to the Base Full Bottle Price =
 * Discounted × 13/10) and never fed the actual SKU prices.
 *
 * This script makes the product-level formula the real source of truth:
 * costPrice is rederived as the true discounted/original price (Base ÷ 1.3
 * for any product still in DIRECT bookkeeping mode), pricingMode is set to
 * PERCENTAGE, pricingInput to 30, and every SKU's retailPrice is recomputed
 * from that (mirrors resyncSkuPricesForProduct in admin-catalog-actions.ts).
 * Products already on PERCENTAGE (e.g. added via the admin form, or
 * add-libre-edt-decant.ts) just get pricingInput normalized to 30 if it
 * wasn't already, and their SKUs resynced for consistency.
 *
 * Usage: npx tsx scripts/normalize-decant-markup.ts
 * Idempotent: re-running after a first successful run is a no-op.
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { eq } from "drizzle-orm";
import { computeRetailPrice, computeSkuRetailPrice } from "@/domain/pricing";
import { db } from "../src/db/client";
import { products, skus } from "../src/db/schema";

const TARGET_MARKUP_PERCENT = 30;
const LEGACY_BASE_TO_DISCOUNTED_RATIO = 1.3; // Base Full Bottle Price = Discounted × 13/10

async function main() {
  const client = db();
  const decantProducts = await client.select().from(products).where(eq(products.type, "DECANT"));

  for (const product of decantProducts) {
    const wasDirect = product.pricingMode === "DIRECT";
    const newCostPrice = wasDirect ? Math.round((product.costPrice ?? 0) / LEGACY_BASE_TO_DISCOUNTED_RATIO) : product.costPrice ?? 0;

    if (product.pricingMode === "PERCENTAGE" && product.pricingInput === TARGET_MARKUP_PERCENT) {
      console.log(`= ${product.brand} — ${product.name} already uniform 30%, skipping`);
      continue;
    }

    await client
      .update(products)
      .set({ costPrice: newCostPrice, pricingMode: "PERCENTAGE", pricingInput: TARGET_MARKUP_PERCENT, updatedAt: new Date() })
      .where(eq(products.id, product.id));

    const referenceRetailPriceCentavos = computeRetailPrice({
      costPriceCentavos: newCostPrice,
      mode: "PERCENTAGE",
      input: TARGET_MARKUP_PERCENT,
    });

    const productSkus = await client.select().from(skus).where(eq(skus.productId, product.id));
    for (const sku of productSkus) {
      const retailPrice = computeSkuRetailPrice({
        referenceRetailPriceCentavos,
        sourceMl: product.sourceMl,
        sizeMl: sku.sizeMl,
      });
      await client.update(skus).set({ retailPrice, updatedAt: new Date() }).where(eq(skus.id, sku.id));
      console.log(`    ${sku.sizeMl}ml: ${sku.retailPrice} -> ${retailPrice}`);
    }
    console.log(`✓ ${product.brand} — ${product.name} (cost ${product.costPrice} -> ${newCostPrice}, mode ${product.pricingMode} -> PERCENTAGE)`);
  }

  console.log(`\nNormalized ${decantProducts.length} decant products to a uniform 30% markup.`);
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
