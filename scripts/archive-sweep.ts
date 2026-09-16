import { config } from "dotenv";
config({ path: ".env.local" });

async function main() {
  // Dynamic import: see scripts/auto-reject-orders.ts for why (tsx/esbuild
  // hoists static imports above this file's own top-level statements, which
  // would run @/lib/archive-sweep's import chain, and its eager getEnv()
  // call, before config() above has populated process.env).
  const { sweepArchivedAccounts } = await import("@/lib/archive-sweep");
  const result = await sweepArchivedAccounts();
  console.log(
    `Archive sweep: deleted ${result.deleted}, skipped ${result.skipped}, failed ${result.failed}`,
  );
  process.exit(result.failed > 0 ? 1 : 0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
