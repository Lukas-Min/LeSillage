import { config } from "dotenv";
config({ path: ".env.local" });

async function main() {
  // Dynamic import: see scripts/auto-reject-orders.ts for why (tsx/esbuild
  // hoists static imports above this file's own top-level statements, which
  // would run these modules' import chains before config() above has
  // populated process.env).
  const { db } = await import("@/db/client");
  const { orders, promoCodeRedemptions } = await import("@/db/schema");
  const { inArray, eq } = await import("drizzle-orm");
  const { releasePromoCodeRedemption } = await import("@/lib/orders");

  const client = db();
  const candidates = await client
    .select({ orderId: orders.id, orderNumber: orders.orderNumber })
    .from(orders)
    .innerJoin(promoCodeRedemptions, eq(promoCodeRedemptions.orderId, orders.id))
    .where(inArray(orders.status, ["REJECTED", "CANCELLED"]));

  let released = 0;
  for (const order of candidates) {
    await releasePromoCodeRedemption(order.orderId);
    released += 1;
    console.log(`Released promo redemption for ${order.orderNumber}`);
  }
  console.log(`Done: released ${released} redemption(s) on already-terminal orders.`);
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
