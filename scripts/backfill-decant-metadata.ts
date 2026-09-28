/**
 * Fills notes, accords, ratings, and photos on decants that already exist.
 * Does not change prices or stock. Data: `scripts/data/decant-metadata.json`,
 * or another file passed as an argument.
 *
 *   npx tsx scripts/backfill-decant-metadata.ts
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { and, eq, ilike } from "drizzle-orm";
import { formatFragranceDescription } from "@/domain/product-type";
import { db } from "@/db/client";
import { productImages, products } from "@/db/schema";
import { formatNotesSummary, loadCatalogJson, runWhenInvoked } from "./catalog-script";

interface MetadataEntry {
  brand: string;
  name: string;
  releaseYear: number | null;
  perfumers: string[];
  notes: { top: string[]; middle: string[]; base: string[] };
  accords: Array<{ name: string; strength: number }>;
  ratingValue: number | null;
  ratingCount: number | null;
  imageUrl: string;
  fragranticaUrl: string;
}

function loadCatalog(): MetadataEntry[] {
  return loadCatalogJson<MetadataEntry[]>("decant-metadata.json");
}

export async function runDecantMetadata(): Promise<void> {
  const catalog = loadCatalog();
  const client = db();
  let updated = 0;
  let notFound = 0;

  for (const entry of catalog) {
    const [existing] = await client
      .select({ id: products.id })
      .from(products)
      .where(and(ilike(products.brand, entry.brand), ilike(products.name, entry.name), eq(products.type, "DECANT")))
      .limit(1);

    if (!existing) {
      console.log(`✗ not found: ${entry.brand} — ${entry.name}`);
      notFound += 1;
      continue;
    }

    await client
      .update(products)
      .set({
        description: formatFragranceDescription(entry),
        notes: formatNotesSummary(entry.notes),
        notePyramid: entry.notes,
        accords: entry.accords,
        perfumers: entry.perfumers,
        ratingValue: entry.ratingValue !== null ? entry.ratingValue.toFixed(2) : null,
        ratingCount: entry.ratingCount,
        releaseYear: entry.releaseYear,
        fragranticaUrl: entry.fragranticaUrl,
        updatedAt: new Date(),
      })
      .where(eq(products.id, existing.id));

    const alt = `${entry.brand} — ${entry.name}`;
    const [existingImage] = await client
      .select({ id: productImages.id })
      .from(productImages)
      .where(eq(productImages.productId, existing.id))
      .limit(1);
    if (existingImage) {
      await client.update(productImages).set({ url: entry.imageUrl, alt }).where(eq(productImages.id, existingImage.id));
    } else {
      await client.insert(productImages).values({ productId: existing.id, url: entry.imageUrl, alt, position: 0 });
    }

    console.log(`✓ metadata ${entry.brand} — ${entry.name}`);
    updated += 1;
  }

  console.log(`Decant metadata: ${updated} updated${notFound ? `, ${notFound} not found` : ""}.`);
}

runWhenInvoked("scripts/backfill-decant-metadata.ts", runDecantMetadata);
