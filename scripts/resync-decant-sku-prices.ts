/**
 * Recomputes every DECANT product's SKU retail price AND cost price from the
 * product's pricing formula (costPrice/pricingMode/pricingInput scaled by
 * sourceMl -> sizeMl), same as resyncSkuPricesForProduct in
 * admin-catalog-actions.ts plus a per-size cost resync it doesn't do.
 *
 * sku.costPrice was left stale by earlier passes (normalize-decant-markup.ts
 * only ever touched retailPrice): it was still the ORIGINAL import's
 * Base-Full-Bottle-Price-per-size figure, which is why the admin product
 * list's "(cost ₱X)" looked almost identical to retail (near-0% margin)
 * instead of reflecting the real ~30% markup — cost and retail were scaled
 * from two different reference prices. Now both derive from the same
 * product-level costPrice via scaleBySize, so cost is what retail was priced
 * off of (retail then rounds up to the nearest ₱5 on top of that).
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
import { computeRetailPrice, computeSkuRetailPrice, scaleBySize } from "@/domain/pricing";
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
      const costPrice = scaleBySize({
        referenceCentavos: product.costPrice ?? 0,
        sourceMl: product.sourceMl,
        sizeMl: sku.sizeMl,
      });
      if (retailPrice !== sku.retailPrice || costPrice !== sku.costPrice) {
        await client.update(skus).set({ retailPrice, costPrice, updatedAt: new Date() }).where(eq(skus.id, sku.id));
        console.log(`    ${sku.sizeMl}ml: retail ${sku.retailPrice} -> ${retailPrice}, cost ${sku.costPrice} -> ${costPrice}`);
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
