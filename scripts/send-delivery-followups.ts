import { config } from "dotenv";
config({ path: ".env.local" });

async function main() {
  // Dynamic import: tsx (esbuild) hoists static imports above this file's
  // own top-level statements, which would run @/lib/delivery-followups's
  // import chain (and its eager getEnv() call) before config() above has
  // populated process.env. A dynamic import is not hoisted, so it only
  // resolves once config() has already run.
  const { sendDueDeliveryFollowups } = await import("@/lib/delivery-followups");
  const result = await sendDueDeliveryFollowups();
  console.log(
    `Delivery follow-ups: sent ${result.sent}, failed ${result.failed}, skipped ${result.skipped}`,
  );
  process.exit(result.failed > 0 ? 1 : 0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
