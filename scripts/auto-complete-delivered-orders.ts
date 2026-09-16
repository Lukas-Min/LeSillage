import { config } from "dotenv";
config({ path: ".env.local" });

async function main() {
  // Dynamic import — see send-delivery-followups.ts for why this can't be
  // a static import.
  const { autoCompleteDeliveredOrders } = await import("@/lib/delivery-auto-complete");
  const result = await autoCompleteDeliveredOrders();
  console.log(
    `Delivery auto-complete: completed ${result.completed}, failed ${result.failed}, skipped ${result.skipped}`,
  );
  process.exit(result.failed > 0 ? 1 : 0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
