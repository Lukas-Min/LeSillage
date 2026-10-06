import { config } from "dotenv";
config({ path: ".env.local" });

import { randomBytes } from "node:crypto";
import { writeFile } from "node:fs/promises";
import { and, eq } from "drizzle-orm";
import { db } from "../src/db/client";
import { productImages } from "../src/db/schema";
import { getEnv } from "../src/lib/env";
import { compressProductPhoto, downloadPhoto } from "../src/lib/product-photos";
import { isSelfHostedProductPhoto, PRODUCT_PHOTO_FOLDER } from "../src/lib/remote-images";

/**
 * One-time move of every product photo into our own Blob store as compressed
 * WebP (quality 80, at most 750px wide), so the shop stops loading photos
 * from Fragrantica's server. Safe to re-run: photos already moved are
 * skipped. A photo that fails to download, convert or upload keeps its old
 * link (the shop still shows it), and is listed at the end.
 *
 *   npm run photos:self-host -- --dry-run   (lists what would change)
 *   npm run photos:self-host
 *
 * Old files are not deleted. Every change is saved to
 * self-host-photos-log-<time>.json (photo id, old link, new link) so it can be
 * undone.
 */
const DRY_RUN = process.argv.includes("--dry-run");
const CONCURRENCY = 4;

interface Change {
  id: string;
  productId: string;
  oldUrl: string;
  newUrl: string;
  oldBytes: number;
  newBytes: number;
}

async function main() {
  const env = getEnv();
  const token = env.BLOB_READ_WRITE_TOKEN;
  // No silent local-disk fallback here (src/lib/blob.ts has one for local
  // dev): a photo link written to the live database must point at Blob.
  if (!token && !DRY_RUN) throw new Error("BLOB_READ_WRITE_TOKEN is not set in .env.local, so photos can't be uploaded.");
  const { put } = await import("@vercel/blob");

  const rows = await db()
    .select({ id: productImages.id, productId: productImages.productId, url: productImages.url })
    .from(productImages);
  const todo = rows.filter((row) => !isSelfHostedProductPhoto(row.url));
  console.log(`${rows.length} product photos, ${rows.length - todo.length} already moved, ${todo.length} to move.`);
  if (DRY_RUN) {
    for (const row of todo) console.log(`  would move ${row.url}`);
    return;
  }

  const changes: Change[] = [];
  const failures: Array<{ id: string; url: string; error: string }> = [];
  let next = 0;
  async function worker() {
    while (next < todo.length) {
      const row = todo[next++];
      try {
        const original = await downloadPhoto(row.url);
        const webp = await compressProductPhoto(original);
        const pathname = `public/${PRODUCT_PHOTO_FOLDER}/${row.productId}/${Date.now()}-${randomBytes(6).toString("hex")}.webp`;
        const blob = await put(pathname, webp, { access: "public", contentType: "image/webp", token });
        // Only if the photo wasn't changed in the admin meanwhile.
        const updated = await db()
          .update(productImages)
          .set({ url: blob.url })
          .where(and(eq(productImages.id, row.id), eq(productImages.url, row.url)))
          .returning({ id: productImages.id });
        if (updated.length === 0) throw new Error("The photo was changed in the admin while moving; left as is");
        changes.push({
          id: row.id,
          productId: row.productId,
          oldUrl: row.url,
          newUrl: blob.url,
          oldBytes: original.byteLength,
          newBytes: webp.byteLength,
        });
        console.log(
          `  moved ${changes.length + failures.length}/${todo.length}: ${(original.byteLength / 1024).toFixed(1)}KB → ${(webp.byteLength / 1024).toFixed(1)}KB`,
        );
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        failures.push({ id: row.id, url: row.url, error: message });
        console.log(`  kept the old link for ${row.url}: ${message}`);
      }
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));

  const logPath = `self-host-photos-log-${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
  await writeFile(logPath, JSON.stringify({ changes, failures }, null, 2));
  const before = changes.reduce((sum, change) => sum + change.oldBytes, 0);
  const after = changes.reduce((sum, change) => sum + change.newBytes, 0);
  console.log("");
  console.log(`Moved ${changes.length} photos: ${(before / 1024).toFixed(0)}KB → ${(after / 1024).toFixed(0)}KB.`);
  if (failures.length > 0) console.log(`${failures.length} kept their old link (listed above); re-run to retry them.`);
  console.log(`Saved the list of changes to ${logPath}. The shop shows the new photos within a minute.`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
