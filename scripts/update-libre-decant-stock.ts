/**
 * Stock/availability update for the three Yves Saint Laurent "Libre" DECANT
 * products, per the store owner's instruction:
 * - Libre (the original EDP) -> 0ml remaining, no size available for
 *   pre-order (fully sold out — deactivates all 4 SKUs).
 * - Libre Le Parfum / Libre Intense -> 10ml remaining, no size available
 *   for pre-order (deactivates only the 30ml SKU — 10ml exactly meets
 *   DEFAULT_DECANT_PREORDER_THRESHOLD_ML, so 3/5/10ml compute as ON_HAND
 *   and stay active; 30ml would still compute PRE_ORDER, so it's turned
 *   off rather than offered).
 *
 * decantFulfillment() (src/domain/decant.ts) is a pure function of
 * remainingMl/sizeMl/threshold — there's no separate "pre-order allowed"
 * flag, so the only way to actually remove a size from pre-order (rather
 * than just being an under-threshold pre-order) is to deactivate its SKU;
 * catalog.ts's storefront queries filter `WHERE skus.isActive`, so an
 * inactive SKU disappears from purchase entirely rather than showing as
 * pre-order or on hand.
 *
 * Usage: npx tsx scripts/update-libre-decant-stock.ts
 * Safe to re-run: recomputes the same target state each time.
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { and, eq, ilike } from "drizzle-orm";
import { db } from "../src/db/client";
import { products, skus } from "../src/db/schema";
import { decantFulfillment, DEFAULT_DECANT_PREORDER_THRESHOLD_ML } from "../src/domain/decant";

const TARGETS = [
  { name: "Libre", remainingMl: 0 },
  { name: "Libre Le Parfum", remainingMl: 10 },
  { name: "Libre Intense", remainingMl: 10 },
] as const;

async function main() {
  const client = db();

  for (const target of TARGETS) {
    const [product] = await client
      .select({ id: products.id, name: products.name })
      .from(products)
      .where(and(ilike(products.brand, "Yves Saint Laurent"), eq(products.name, target.name), eq(products.type, "DECANT")))
      .limit(1);

    if (!product) {
      console.log(`✗ No DECANT product named "${target.name}" found — skipping.`);
      continue;
    }

    await client
      .update(products)
      .set({ remainingMl: target.remainingMl, updatedAt: new Date() })
      .where(eq(products.id, product.id));

    const skuRows = await client
      .select({ id: skus.id, sizeMl: skus.sizeMl, label: skus.label })
      .from(skus)
      .where(eq(skus.productId, product.id));

    console.log(`${product.name}: remainingMl -> ${target.remainingMl}`);
    for (const sku of skuRows) {
      if (sku.sizeMl === null) continue;
      const fulfillment = decantFulfillment({
        remainingMl: target.remainingMl,
        sizeMl: sku.sizeMl,
        thresholdMl: DEFAULT_DECANT_PREORDER_THRESHOLD_ML,
      });
      const isActive = fulfillment === "ON_HAND";
      await client.update(skus).set({ isActive, updatedAt: new Date() }).where(eq(skus.id, sku.id));
      console.log(`  ${sku.label}: ${isActive ? "active (on hand)" : "deactivated (would be pre-order)"}`);
    }
  }

  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
