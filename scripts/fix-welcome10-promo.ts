import { config } from "dotenv";
config({ path: ".env.local" });

import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { eq } from "drizzle-orm";
import * as schema from "../src/db/schema";
import { promoCodes } from "../src/db/schema";

/**
 * One-off: WELCOME10 was created as a DELIVERY-scope FIXED ₱120 code, i.e. free
 * delivery for a first order, despite its name reading as "10% off". This puts
 * it on its intended terms — 10% off the merchandise (perfumes) subtotal only,
 * available on any order, once per account.
 *
 * Equivalent to editing it in /admin/promo -> Promo codes -> Edit; this exists
 * because that UI shipped after the code did. Safe to re-run — it is a plain
 * UPDATE to a fixed target state, and it never touches isActive or
 * redemptionCount (the redemption ledger stays intact).
 *
 *   npx tsx scripts/fix-welcome10-promo.ts
 */

const CODE = "WELCOME10";

const url = process.env.DATABASE_URL;
if (!url) {
  throw new Error("DATABASE_URL not set. Copy .env.example to .env.local and fill in the connection string.");
}

const sqlClient = postgres(url, { prepare: false });
const db = drizzle(sqlClient, { schema });

function describe(row: typeof promoCodes.$inferSelect) {
  const amount = row.type === "PERCENTAGE" ? `${row.amount}%` : `₱${(row.amount / 100).toFixed(2)}`;
  return [
    `${amount} off ${row.scope === "ORDER" ? "the merchandise subtotal" : "delivery"}`,
    row.firstOrderOnly ? "first order only" : "any order",
    row.onePerCustomer ? "once per customer" : "repeatable",
    `${row.redemptionCount} redemption(s)`,
    row.isActive ? "active" : "inactive",
  ].join(" · ");
}

async function main() {
  console.log(`Database: ${url!.replace(/^[^@]*@/, "").replace(/\/.*$/, "")}`);

  const [before] = await db.select().from(promoCodes).where(eq(promoCodes.code, CODE));
  if (!before) {
    console.error(`No promo code named ${CODE} exists — nothing to do.`);
    process.exitCode = 1;
    return;
  }
  console.log(`BEFORE  ${CODE}: ${describe(before)}`);

  const [after] = await db
    .update(promoCodes)
    .set({
      scope: "ORDER",
      type: "PERCENTAGE",
      amount: 10,
      firstOrderOnly: false,
      onePerCustomer: true,
    })
    .where(eq(promoCodes.code, CODE))
    .returning();

  console.log(`AFTER   ${CODE}: ${describe(after)}`);
  console.log("Done. Delivery is charged normally; 10% comes off the perfumes only.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => sqlClient.end());
