/**
 * One-time data migration for the new decant RETAIL vs IN_HOUSE provenance
 * distinction. Before this feature, every decant SKU's `provenance` was
 * "RETAIL" by default (a leftover from sharing the enum with full bottles),
 * but every existing decant is actually poured to order from a whole bottle
 * we own — i.e. IN_HOUSE under the new meaning. RETAIL now means something
 * new and different for a decant (bought pre-made from the perfumery, with
 * its own stock count) that doesn't apply to any existing SKU.
 *
 * Without this, every existing decant SKU would suddenly be read as RETAIL
 * under the new fulfillment logic (see effectiveFulfillment/resolveCartCap
 * in src/lib/cart.ts) — using its own (never-populated) stock/fulfillment
 * columns instead of the shared remainingMl pool, showing every decant as
 * sold out.
 *
 * Run once: npx tsx scripts/migrate-decant-provenance-to-in-house.ts
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import postgres from "postgres";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL not set");

const sql = postgres(url, { prepare: false });

async function main() {
  const before = await sql`
    SELECT s."provenance", count(*) FROM sku s
    JOIN product p ON p.id = s."productId"
    WHERE p."type" = 'DECANT'
    GROUP BY s."provenance"
  `;
  console.log("Before:", before);

  const updated = await sql`
    UPDATE sku SET "provenance" = 'IN_HOUSE'
    WHERE "productId" IN (SELECT id FROM product WHERE "type" = 'DECANT')
      AND "provenance" = 'RETAIL'
    RETURNING id
  `;
  console.log(`Updated ${updated.length} decant SKUs from RETAIL to IN_HOUSE.`);

  const after = await sql`
    SELECT s."provenance", count(*) FROM sku s
    JOIN product p ON p.id = s."productId"
    WHERE p."type" = 'DECANT'
    GROUP BY s."provenance"
  `;
  console.log("After:", after);

  await sql.end();
}

main().catch((err) => {
  console.error("MIGRATION FAILED:", err.message);
  process.exit(1);
});
