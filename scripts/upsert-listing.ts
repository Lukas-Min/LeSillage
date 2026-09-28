/**
 * Add or update a catalog listing from a JSON file instead of a one-off script.
 *
 * Dry-run (reads the database, writes nothing):
 *   npx tsx scripts/upsert-listing.ts scripts/listings/example.json
 *
 * Write:
 *   npx tsx scripts/upsert-listing.ts scripts/listings/example.json --apply
 *
 * The file is one listing object, or an array of them. See listingSchema in
 * scripts/lib/upsert-listing.ts. A re-run never overwrites remainingMl.
 */
import { readFileSync } from "fs";
import { config } from "dotenv";
config({ path: ".env.local" });

import { upsertListing } from "./lib/upsert-listing";

async function main() {
  const args = process.argv.slice(2).filter((arg) => arg !== "--apply");
  const apply = process.argv.includes("--apply");
  const file = args[0];
  if (!file) {
    console.error("Usage: npx tsx scripts/upsert-listing.ts <listing.json> [--apply]");
    process.exit(1);
  }
  const parsed = JSON.parse(readFileSync(file, "utf8")) as unknown;
  const listings = Array.isArray(parsed) ? parsed : [parsed];
  if (!apply) console.log("Dry run. Pass --apply to write.");
  for (const listing of listings) {
    await upsertListing(listing, { apply });
  }
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
