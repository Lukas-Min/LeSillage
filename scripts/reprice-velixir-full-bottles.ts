/**
 * Repricing pass for every Velixir FULL_BOTTLE listing (all 19 added by
 * add-velixir-icarus-full-bottle.ts / add-velixir-full-bottles.ts): retail
 * price raised from a direct ₱3,000 to a direct ₱3,200, with a 10%
 * PERCENTAGE product discount added on top (₱320 off, landing at ₱2,880) —
 * PERCENTAGE rather than a flat ₱300/₱320 FIXED amount so the discount
 * stays a genuine 10% (and the displayed "Save 10%" badge stays honest) if
 * the retail price is ever changed later, instead of pinning the final
 * price to a stale flat number. (An earlier pass here used a ₱300 FIXED
 * discount landing at ₱2,900 — that was only 9.375% off, not a clean 10%,
 * which is why this switched to PERCENTAGE.) Per the item-discount-vs-
 * promo-code rule in src/domain/checkout-totals.ts, an ORDER-scope promo
 * code like WELCOME10 no longer also stacks on top of this.
 *
 * Usage: npx tsx scripts/reprice-velixir-full-bottles.ts
 * Safe to re-run: updates the SKU's stored price and upserts (converts any
 * existing discount row rather than duplicating) one active PERCENTAGE
 * discount per product.
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { and, eq } from "drizzle-orm";
import { db } from "../src/db/client";
import { products, skus, productDiscounts } from "../src/db/schema";

const BRAND = "Velixir";
const NEW_RETAIL_PRICE_PHP = 3200;
const DISCOUNT_PERCENT = 10;

function php(pesos: number) {
  return Math.round(pesos * 100);
}

async function main() {
  const client = db();
  const retailPrice = php(NEW_RETAIL_PRICE_PHP);

  const rows = await client
    .select({ id: products.id, name: products.name })
    .from(products)
    .where(and(eq(products.brand, BRAND), eq(products.type, "FULL_BOTTLE")));

  console.log(`Found ${rows.length} Velixir full-bottle product(s).`);

  for (const row of rows) {
    await client
      .update(skus)
      .set({ retailPrice, pricingMode: "DIRECT", pricingInput: retailPrice, updatedAt: new Date() })
      .where(eq(skus.productId, row.id));

    // Matched by productId alone (not filtered by type) so a prior FIXED
    // discount from an earlier pass is converted to PERCENTAGE here, not
    // left behind as a stale duplicate.
    const [existingDiscount] = await client
      .select({ id: productDiscounts.id })
      .from(productDiscounts)
      .where(eq(productDiscounts.productId, row.id))
      .limit(1);
    if (existingDiscount) {
      await client
        .update(productDiscounts)
        .set({ type: "PERCENTAGE", amount: DISCOUNT_PERCENT, isActive: true, startsAt: null, endsAt: null })
        .where(eq(productDiscounts.id, existingDiscount.id));
    } else {
      await client.insert(productDiscounts).values({
        productId: row.id,
        type: "PERCENTAGE",
        amount: DISCOUNT_PERCENT,
        startsAt: null,
        endsAt: null,
        isActive: true,
      });
    }

    const discountedPhp = Math.round((NEW_RETAIL_PRICE_PHP * (100 - DISCOUNT_PERCENT)) / 100);
    console.log(`✓ ${BRAND} — ${row.name}: retail ₱${NEW_RETAIL_PRICE_PHP}, -${DISCOUNT_PERCENT}% -> ₱${discountedPhp}`);
  }

  console.log(`\nRepriced ${rows.length} Velixir full-bottle product(s).`);
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
