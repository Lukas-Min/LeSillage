import { config } from "dotenv";
config({ path: ".env.local" });

import { writeFile } from "node:fs/promises";
import { getEnv } from "../src/lib/env";
import { movePhotos, photosToMove } from "../src/lib/product-photos";

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
 * The admin Products page's "Move photos" button does the same on the server
 * (moveProductPhotosBatch), a batch at a time.
 *
 * Old files are not deleted. Every change is saved to
 * self-host-photos-log-<time>.json (photo id, old link, new link) so it can be
 * undone.
 */
const DRY_RUN = process.argv.includes("--dry-run");

async function main() {
  if (!getEnv().BLOB_READ_WRITE_TOKEN && !DRY_RUN) {
    throw new Error("BLOB_READ_WRITE_TOKEN is not set in .env.local, so photos can't be uploaded.");
  }
  const todo = await photosToMove();
  console.log(`${todo.length} product photos to move.`);
  if (DRY_RUN) {
    for (const row of todo) console.log(`  would move ${row.url}`);
    return;
  }

  let done = 0;
  const { moved, failed } = await movePhotos(todo, ({ moved: one, failed: fail }) => {
    done += 1;
    if (one) {
      console.log(`  moved ${done}/${todo.length}: ${(one.oldBytes / 1024).toFixed(1)}KB → ${(one.newBytes / 1024).toFixed(1)}KB`);
    } else if (fail) {
      console.log(`  kept the old link for ${fail.url}: ${fail.error}`);
    }
  });

  const logPath = `self-host-photos-log-${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
  await writeFile(logPath, JSON.stringify({ moved, failed }, null, 2));
  const before = moved.reduce((sum, change) => sum + change.oldBytes, 0);
  const after = moved.reduce((sum, change) => sum + change.newBytes, 0);
  console.log("");
  console.log(`Moved ${moved.length} photos: ${(before / 1024).toFixed(0)}KB → ${(after / 1024).toFixed(0)}KB.`);
  if (failed.length > 0) console.log(`${failed.length} kept their old link (listed above); re-run to retry them.`);
  console.log(`Saved the list of changes to ${logPath}. The shop shows the new photos within a minute.`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
