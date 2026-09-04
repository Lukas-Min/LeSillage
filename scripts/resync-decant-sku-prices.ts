/**
 * Recomputes every DECANT product's SKU retail prices from the product's
 * pricing formula (costPrice/pricingMode/pricingInput scaled by sourceMl ->
 * sizeMl), same as resyncSkuPricesForProduct in admin-catalog-actions.ts.
 *
 * Run after any change to computeSkuRetailPrice's rounding behavior (see
 * src/domain/pricing.ts) so already-stored prices pick up the new rule —
 * unlike normalize-decant-markup.ts, this does NOT skip products whose
 * pricingMode/pricingInput are already correct, since the formula's *output*
 * is what changed here, not the inputs.
 *
 * Usage: npx tsx scripts/resync-decant-sku-prices.ts
 * Idempotent: re-running after prices already match the formula is a no-op.
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { eq } from "drizzle-orm";
import { computeRetailPrice, computeSkuRetailPrice } from "@/domain/pricing";
import { db } from "../src/db/client";
import { products, skus } from "../src/db/schema";

async function main() {
  const client = db();
  const decantProducts = await client.select().from(products).where(eq(products.type, "DECANT"));

  for (const product of decantProducts) {
    const referenceRetailPriceCentavos = computeRetailPrice({
      costPriceCentavos: product.costPrice ?? 0,
      mode: product.pricingMode,
      input: product.pricingInput,
    });
    const productSkus = await client.select().from(skus).where(eq(skus.productId, product.id));
    let changed = 0;
    for (const sku of productSkus) {
      const retailPrice = computeSkuRetailPrice({
        referenceRetailPriceCentavos,
        sourceMl: product.sourceMl,
        sizeMl: sku.sizeMl,
      });
      if (retailPrice !== sku.retailPrice) {
        await client.update(skus).set({ retailPrice, updatedAt: new Date() }).where(eq(skus.id, sku.id));
        console.log(`    ${sku.sizeMl}ml: ${sku.retailPrice} -> ${retailPrice}`);
        changed += 1;
      }
    }
    console.log(`${changed > 0 ? "✓" : "="} ${product.brand} — ${product.name} (${changed} price(s) updated)`);
  }

  console.log(`\nResynced ${decantProducts.length} decant products.`);
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
