/**
 * Runs the catalog imports. Full bottles do not share rows with decants, so
 * they run at the same time as the decant price pass. Decant notes run after
 * those prices, because they only update rows the price pass creates.
 *
 *   npx tsx scripts/import-catalog.ts
 */
import { config } from "dotenv";
config({ path: ".env.local" });

async function main() {
  const { runDecantPricelist } = await import("./import-decant-pricelist");
  const { runDecantMetadata } = await import("./backfill-decant-metadata");
  const { runFullBottlePricelist } = await import("./import-full-bottle-pricelist");

  await Promise.all([
    runDecantPricelist().then(() => runDecantMetadata()),
    runFullBottlePricelist(),
  ]);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
