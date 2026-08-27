import { config } from "dotenv";
config({ path: ".env.local" });

import { eq, isNotNull } from "drizzle-orm";
import { db } from "../src/db/client";
import { products, productImages } from "../src/db/schema";
import { normalize } from "../src/lib/fragella";

async function main() {
  const client = db();
  const rows = await client
    .select({ id: products.id, name: products.name, brand: products.brand, fragellaPayload: products.fragellaPayload })
    .from(products)
    .where(isNotNull(products.fragellaPayload));

  let updated = 0;
  let skipped = 0;

  for (const row of rows) {
    if (!row.fragellaPayload || typeof row.fragellaPayload !== "object") {
      skipped += 1;
      continue;
    }
    const record = normalize(row.fragellaPayload as Record<string, unknown>);
    if (!record.imageUrl) {
      skipped += 1;
      continue;
    }
    const existing = await client
      .select({ id: productImages.id })
      .from(productImages)
      .where(eq(productImages.productId, row.id))
      .limit(1);
    if (existing.length > 0) {
      await client
        .update(productImages)
        .set({ url: record.imageUrl, alt: `${row.brand} — ${row.name}` })
        .where(eq(productImages.id, existing[0].id));
    } else {
      await client.insert(productImages).values({
        productId: row.id,
        url: record.imageUrl,
        alt: `${row.brand} — ${row.name}`,
        position: 0,
      });
    }
    updated += 1;
    console.log(`✓ ${row.brand} — ${row.name}: ${record.imageUrl}`);
  }

  console.log(`Backfilled ${updated} product images, skipped ${skipped} (no image in stored payload).`);
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
