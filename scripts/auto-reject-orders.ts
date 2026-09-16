import { config } from "dotenv";
config({ path: ".env.local" });

async function main() {
  // Dynamic import: tsx (esbuild) hoists static imports above this file's
  // own top-level statements, which would run @/lib/auto-reject-orders's
  // import chain (and its eager getEnv() call) before config() above has
  // populated process.env. A dynamic import is not hoisted, so it only
  // resolves once config() has already run.
  const { autoRejectExpiredOrders } = await import("@/lib/auto-reject-orders");
  const result = await autoRejectExpiredOrders();
  console.log(
    `Auto-reject: cancelled ${result.cancelled}, failed ${result.failed}, skipped ${result.skipped}`,
  );
  process.exit(result.failed > 0 ? 1 : 0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
