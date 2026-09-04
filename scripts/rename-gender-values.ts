/**
 * One-off rename of product.gender values: "male" -> "men", "female" -> "women".
 * "unisex" (and any other free-text gender value) is left untouched.
 * Matches src/domain/gender.ts, which now uses GENDERS = ["men", "women", "unisex"].
 *
 * Usage: npx tsx scripts/rename-gender-values.ts
 * Idempotent: re-running finds nothing left to rename.
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { ilike } from "drizzle-orm";
import { db } from "../src/db/client";
import { products } from "../src/db/schema";

async function main() {
  const client = db();

  const maleRows = await client.update(products).set({ gender: "men" }).where(ilike(products.gender, "male")).returning({ id: products.id });
  console.log(`male -> men: ${maleRows.length} product(s)`);

  const femaleRows = await client
    .update(products)
    .set({ gender: "women" })
    .where(ilike(products.gender, "female"))
    .returning({ id: products.id });
  console.log(`female -> women: ${femaleRows.length} product(s)`);

  const remaining = await client.select({ gender: products.gender }).from(products);
  const distinct = [...new Set(remaining.map((r) => r.gender).filter(Boolean))];
  console.log(`Distinct gender values now in use: ${distinct.join(", ")}`);
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
