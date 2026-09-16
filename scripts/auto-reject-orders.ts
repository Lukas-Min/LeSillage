import { config } from "dotenv";
config({ path: ".env.local" });

import { autoRejectExpiredOrders } from "@/lib/auto-reject-orders";

async function main() {
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
