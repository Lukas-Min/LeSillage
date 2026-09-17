import { config } from "dotenv";
config({ path: ".env.local" });

/**
 * Builds the free-tester pool from the catalogue by rule, so it doesn't have
 * to be ticked SKU by SKU in admin:
 *
 *   - Middle Eastern decants: the 3ml and 5ml sizes
 *   - Designer decants:       the 3ml size only
 *   - Niche decants:          never
 *
 * Only flips the flag ON for matching SKUs; nothing already flagged is
 * touched, and nothing outside the rule is un-flagged (an admin's own
 * hand-picks stay). Dry run by default — pass --apply to write.
 *
 *   npm run flag-tester-pool            # preview
 *   npm run flag-tester-pool -- --apply # write + audit
 */
async function main() {
  // Dynamic import so config() above runs before @/lib/env's eager getEnv().
  const { db } = await import("@/db/client");
  const { skus, products, users } = await import("@/db/schema");
  const { auditLogSubject } = await import("@/lib/audit");
  const { and, eq, inArray, or } = await import("drizzle-orm");

  const apply = process.argv.includes("--apply");
  const client = db();

  const rows = await client
    .select({
      skuId: skus.id,
      label: skus.label,
      sizeMl: skus.sizeMl,
      isTester: skus.isTester,
      name: products.name,
      brand: products.brand,
      category: products.fragranceCategory,
    })
    .from(skus)
    .innerJoin(products, eq(products.id, skus.productId))
    .where(
      and(
        eq(products.type, "DECANT"),
        eq(skus.isActive, true),
        or(
          and(eq(products.fragranceCategory, "MIDDLE_EASTERN"), inArray(skus.sizeMl, [3, 5])),
          and(eq(products.fragranceCategory, "DESIGNER"), eq(skus.sizeMl, 3)),
        ),
      ),
    )
    .orderBy(products.fragranceCategory, products.name, skus.sizeMl);

  const toFlag = rows.filter((r) => !r.isTester);
  console.log(`${rows.length} SKUs match the rule; ${toFlag.length} not yet flagged.\n`);
  for (const r of rows) {
    console.log(`  ${r.isTester ? "=" : "+"} ${r.category?.padEnd(14)} ${r.name} · ${r.label}`);
  }
  if (!apply) {
    console.log("\nDry run — re-run with --apply to write.");
    process.exit(0);
  }
  if (toFlag.length === 0) {
    console.log("\nNothing to do.");
    process.exit(0);
  }

  const admin = (await client.select({ id: users.id }).from(users).where(eq(users.role, "ADMIN")))[0];
  await client.transaction(async (tx) => {
    for (const r of toFlag) {
      // Same write as setSkuTester / upsertSku: the flag plus the brand
      // snapshot pickTester matches on.
      await tx
        .update(skus)
        .set({ isTester: true, testerBrand: r.brand, updatedAt: new Date() })
        .where(eq(skus.id, r.skuId));
    }
  });
  if (admin) {
    for (const r of toFlag) {
      await auditLogSubject({
        actor: admin.id,
        action: "SKU_UPDATE",
        targetType: "sku",
        targetId: r.skuId,
        metadata: { isTester: true, via: "scripts/flag-tester-pool.ts" },
      });
    }
  }
  console.log(`\nFlagged ${toFlag.length} SKUs as free testers.`);
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
