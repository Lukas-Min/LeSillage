/**
 * Fills notes, accords, ratings, and photos on decants that already exist.
 * Does not change prices or stock. Data: `scripts/data/decant-metadata.json`.
 *
 *   npx tsx scripts/backfill-decant-metadata.ts
 */
import { readFileSync } from "fs";
import { config } from "dotenv";
config({ path: ".env.local" });

import { and, eq, ilike } from "drizzle-orm";
import { formatFragranceDescription } from "@/domain/product-type";
import { db } from "@/db/client";
import { productImages, products } from "@/db/schema";

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
  return JSON.parse(readFileSync(new URL("./data/decant-metadata.json", import.meta.url), "utf8")) as MetadataEntry[];
}

function formatNotesSummary(notes: MetadataEntry["notes"]) {
  return [
    notes.top.length ? `Top: ${notes.top.join(", ")}` : null,
    notes.middle.length ? `Middle: ${notes.middle.join(", ")}` : null,
    notes.base.length ? `Base: ${notes.base.join(", ")}` : null,
  ]
    .filter(Boolean)
    .join(" | ");
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

const invokedDirectly = process.argv[1]?.replace(/\\/g, "/").endsWith("scripts/backfill-decant-metadata.ts");
if (invokedDirectly) {
  runDecantMetadata()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}
