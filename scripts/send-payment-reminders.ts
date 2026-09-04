import { config } from "dotenv";
config({ path: ".env.local" });

import { sendDuePaymentReminders } from "@/lib/payment-reminders";

async function main() {
  const result = await sendDuePaymentReminders();
  console.log(
    `Payment reminders: sent ${result.sent}, failed ${result.failed}, skipped ${result.skipped}`,
  );
  process.exit(result.failed > 0 ? 1 : 0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
