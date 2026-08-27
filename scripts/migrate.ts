import { config } from "dotenv";
config({ path: ".env.local" });

import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "../src/db/schema";

const url = process.env.DATABASE_URL;
if (!url) {
  throw new Error("DATABASE_URL not set. Copy .env.example to .env.local and fill in the Supabase connection string.");
}

const sqlClient = postgres(url, { prepare: false });
const db = drizzle(sqlClient, { schema });

async function main() {
  console.log("Running baseline migration against Supabase Postgres");

  await db.execute(`CREATE EXTENSION IF NOT EXISTS "pgcrypto"`);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS "user" (
      "id" text PRIMARY KEY,
      "name" text,
      "email" text UNIQUE,
      "emailVerified" timestamp,
      "image" text,
      "role" text NOT NULL DEFAULT 'CUSTOMER',
      "phone" text,
      "defaultAddressId" text,
      "marketingOptIn" boolean NOT NULL DEFAULT false,
      "deletedAt" timestamp,
      "createdAt" timestamp NOT NULL DEFAULT now()
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS "account" (
      "userId" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
      "type" text NOT NULL,
      "provider" text NOT NULL,
      "providerAccountId" text NOT NULL,
      "refresh_token" text,
      "access_token" text,
      "expires_at" integer,
      "token_type" text,
      "scope" text,
      "id_token" text,
      "session_state" text,
      PRIMARY KEY ("provider", "providerAccountId")
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS "session" (
      "sessionToken" text PRIMARY KEY,
      "userId" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
      "expires" timestamp NOT NULL
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS "verificationToken" (
      "identifier" text NOT NULL,
      "token" text NOT NULL,
      "expires" timestamp NOT NULL,
      PRIMARY KEY ("identifier", "token")
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS "address" (
      "id" text PRIMARY KEY,
      "userId" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
      "label" text,
      "recipientName" text NOT NULL,
      "phone" text NOT NULL,
      "region" text NOT NULL,
      "province" text NOT NULL,
      "city" text NOT NULL,
      "barangay" text NOT NULL,
      "postalCode" text NOT NULL,
      "street" text NOT NULL,
      "isDefault" boolean NOT NULL DEFAULT false,
      "createdAt" timestamp NOT NULL DEFAULT now()
    )
  `);

  await db.execute(`CREATE INDEX IF NOT EXISTS "address_user_idx" ON "address" ("userId")`);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS "cart" (
      "id" text PRIMARY KEY,
      "userId" text REFERENCES "user"("id") ON DELETE CASCADE,
      "guestToken" text,
      "updatedAt" timestamp NOT NULL DEFAULT now(),
      "createdAt" timestamp NOT NULL DEFAULT now()
    )
  `);

  await db.execute(`CREATE INDEX IF NOT EXISTS "cart_user_idx" ON "cart" ("userId")`);
  await db.execute(`CREATE INDEX IF NOT EXISTS "cart_guest_idx" ON "cart" ("guestToken")`);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS "product" (
      "id" text PRIMARY KEY,
      "type" text NOT NULL,
      "fragranceCategory" text NOT NULL DEFAULT 'NICHE',
      "name" text NOT NULL,
      "brand" text NOT NULL,
      "family" text,
      "description" text,
      "notes" text,
      "isActive" boolean NOT NULL DEFAULT true,
      "createdAt" timestamp NOT NULL DEFAULT now(),
      "updatedAt" timestamp NOT NULL DEFAULT now()
    )
  `);

  await db.execute(`CREATE INDEX IF NOT EXISTS "product_type_idx" ON "product" ("type")`);
  await db.execute(`CREATE INDEX IF NOT EXISTS "product_brand_idx" ON "product" ("brand")`);
  await db.execute(
    `CREATE INDEX IF NOT EXISTS "product_category_idx" ON "product" ("fragranceCategory")`,
  );

  await db.execute(`
    CREATE TABLE IF NOT EXISTS "sku" (
      "id" text PRIMARY KEY,
      "productId" text NOT NULL REFERENCES "product"("id") ON DELETE CASCADE,
      "sku" text NOT NULL,
      "label" text NOT NULL,
      "sizeMl" integer,
      "remainingMl" integer,
      "condition" text NOT NULL DEFAULT 'BNIB',
      "provenance" text NOT NULL DEFAULT 'RETAIL',
      "packaging" text NOT NULL DEFAULT 'WITH_BOX',
      "costPrice" integer NOT NULL,
      "retailPrice" integer NOT NULL,
      "pricingMode" text NOT NULL DEFAULT 'PERCENTAGE',
      "pricingInput" integer NOT NULL DEFAULT 0,
      "fulfillment" text NOT NULL,
      "stock" integer NOT NULL DEFAULT 0,
      "isTester" boolean NOT NULL DEFAULT false,
      "testerFamily" text,
      "testerBrand" text,
      "isActive" boolean NOT NULL DEFAULT true,
      "createdAt" timestamp NOT NULL DEFAULT now(),
      "updatedAt" timestamp NOT NULL DEFAULT now()
    )
  `);

  await db.execute(`CREATE INDEX IF NOT EXISTS "sku_product_idx" ON "sku" ("productId")`);
  await db.execute(
    `CREATE UNIQUE INDEX IF NOT EXISTS "sku_sku_idx" ON "sku" ("sku")`,
  );
  await db.execute(`CREATE INDEX IF NOT EXISTS "sku_condition_idx" ON "sku" ("condition")`);
  await db.execute(`CREATE INDEX IF NOT EXISTS "sku_provenance_idx" ON "sku" ("provenance")`);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS "cart_item" (
      "id" text PRIMARY KEY,
      "cartId" text NOT NULL REFERENCES "cart"("id") ON DELETE CASCADE,
      "skuId" text NOT NULL REFERENCES "sku"("id") ON DELETE RESTRICT,
      "quantity" integer NOT NULL DEFAULT 1,
      "createdAt" timestamp NOT NULL DEFAULT now()
    )
  `);

  await db.execute(
    `CREATE UNIQUE INDEX IF NOT EXISTS "cart_item_cart_sku_idx" ON "cart_item" ("cartId", "skuId")`,
  );

  await db.execute(`
    CREATE TABLE IF NOT EXISTS "wishlist" (
      "id" text PRIMARY KEY,
      "userId" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
      "productId" text NOT NULL REFERENCES "product"("id") ON DELETE CASCADE,
      "createdAt" timestamp NOT NULL DEFAULT now()
    )
  `);

  await db.execute(
    `CREATE UNIQUE INDEX IF NOT EXISTS "wishlist_user_product_idx" ON "wishlist" ("userId", "productId")`,
  );

  await db.execute(`
    CREATE TABLE IF NOT EXISTS "product_image" (
      "id" text PRIMARY KEY,
      "productId" text NOT NULL REFERENCES "product"("id") ON DELETE CASCADE,
      "url" text NOT NULL,
      "alt" text,
      "position" integer NOT NULL DEFAULT 0
    )
  `);

  await db.execute(
    `CREATE INDEX IF NOT EXISTS "product_image_product_idx" ON "product_image" ("productId")`,
  );

  await db.execute(`
    CREATE TABLE IF NOT EXISTS "product_discount" (
      "id" text PRIMARY KEY,
      "productId" text NOT NULL REFERENCES "product"("id") ON DELETE CASCADE,
      "type" text NOT NULL,
      "amount" integer NOT NULL,
      "startsAt" timestamp,
      "endsAt" timestamp,
      "isActive" boolean NOT NULL DEFAULT true,
      "createdAt" timestamp NOT NULL DEFAULT now()
    )
  `);

  await db.execute(
    `CREATE INDEX IF NOT EXISTS "product_discount_product_idx" ON "product_discount" ("productId")`,
  );

  await db.execute(`
    CREATE TABLE IF NOT EXISTS "promo_setting" (
      "id" text PRIMARY KEY DEFAULT 'singleton',
      "decantThresholdCentavos" integer NOT NULL DEFAULT 200000,
      "deliveryFeeCentavos" integer NOT NULL DEFAULT 12000,
      "freeDeliveryEnabled" boolean NOT NULL DEFAULT true,
      "testerBonusEnabled" boolean NOT NULL DEFAULT true,
      "updatedAt" timestamp NOT NULL DEFAULT now()
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS "qr_code" (
      "id" text PRIMARY KEY,
      "bankName" text NOT NULL,
      "accountName" text NOT NULL,
      "accountNumber" text NOT NULL,
      "imageUrl" text NOT NULL,
      "isActive" boolean NOT NULL DEFAULT true,
      "position" integer NOT NULL DEFAULT 0,
      "createdAt" timestamp NOT NULL DEFAULT now()
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS "stock_movement" (
      "id" text PRIMARY KEY,
      "skuId" text NOT NULL REFERENCES "sku"("id") ON DELETE RESTRICT,
      "delta" integer NOT NULL,
      "reason" text NOT NULL,
      "orderId" text,
      "note" text,
      "createdAt" timestamp NOT NULL DEFAULT now()
    )
  `);

  await db.execute(
    `CREATE INDEX IF NOT EXISTS "stock_movement_sku_idx" ON "stock_movement" ("skuId")`,
  );
  await db.execute(
    `CREATE INDEX IF NOT EXISTS "stock_movement_order_idx" ON "stock_movement" ("orderId")`,
  );

  await db.execute(`
    CREATE TABLE IF NOT EXISTS "order" (
      "id" text PRIMARY KEY,
      "orderNumber" text NOT NULL,
      "userId" text NOT NULL REFERENCES "user"("id") ON DELETE RESTRICT,
      "status" text NOT NULL DEFAULT 'AWAITING_PAYMENT',
      "fulfillmentMethod" text NOT NULL,
      "recipientName" text NOT NULL,
      "email" text NOT NULL,
      "phone" text NOT NULL,
      "addressSnapshot" jsonb,
      "pickupNotes" text,
      "notes" text,
      "subtotalCentavos" integer NOT NULL,
      "discountCentavos" integer NOT NULL DEFAULT 0,
      "deliveryFeeCentavos" integer NOT NULL DEFAULT 0,
      "totalCentavos" integer NOT NULL,
      "promoTesterResult" text,
      "promoTesterSkuId" text REFERENCES "sku"("id") ON DELETE SET NULL,
      "statusReason" text,
      "statusUpdatedAt" timestamp NOT NULL DEFAULT now(),
      "createdAt" timestamp NOT NULL DEFAULT now(),
      "updatedAt" timestamp NOT NULL DEFAULT now()
    )
  `);

  await db.execute(
    `CREATE UNIQUE INDEX IF NOT EXISTS "order_number_idx" ON "order" ("orderNumber")`,
  );
  await db.execute(`CREATE INDEX IF NOT EXISTS "order_user_idx" ON "order" ("userId")`);
  await db.execute(`CREATE INDEX IF NOT EXISTS "order_status_idx" ON "order" ("status")`);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS "order_item" (
      "id" text PRIMARY KEY,
      "orderId" text NOT NULL REFERENCES "order"("id") ON DELETE CASCADE,
      "skuId" text NOT NULL REFERENCES "sku"("id") ON DELETE RESTRICT,
      "productName" text NOT NULL,
      "skuLabel" text NOT NULL,
      "productType" text NOT NULL,
      "fragranceCategory" text,
      "condition" text,
      "provenance" text,
      "packaging" text,
      "fulfillment" text NOT NULL,
      "quantity" integer NOT NULL,
      "originalUnitCentavos" integer NOT NULL,
      "unitPriceCentavos" integer NOT NULL,
      "discountCentavos" integer NOT NULL DEFAULT 0,
      "lineTotalCentavos" integer NOT NULL
    )
  `);

  await db.execute(
    `CREATE INDEX IF NOT EXISTS "order_item_order_idx" ON "order_item" ("orderId")`,
  );
  await db.execute(
    `CREATE INDEX IF NOT EXISTS "order_item_sku_idx" ON "order_item" ("skuId")`,
  );

  await db.execute(`
    CREATE TABLE IF NOT EXISTS "receipt" (
      "id" text PRIMARY KEY,
      "orderId" text NOT NULL REFERENCES "order"("id") ON DELETE CASCADE,
      "blobUrl" text NOT NULL,
      "submittedAt" timestamp NOT NULL DEFAULT now(),
      "note" text
    )
  `);

  await db.execute(
    `CREATE INDEX IF NOT EXISTS "receipt_order_idx" ON "receipt" ("orderId")`,
  );

  await db.execute(`
    CREATE TABLE IF NOT EXISTS "admin_session" (
      "id" text PRIMARY KEY,
      "issuedAt" timestamp NOT NULL DEFAULT now(),
      "expiresAt" timestamp NOT NULL,
      "ipHash" text
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS "option_list" (
      "key" text PRIMARY KEY,
      "description" text,
      "updatedAt" timestamp NOT NULL DEFAULT now()
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS "option_value" (
      "id" text PRIMARY KEY,
      "listKey" text NOT NULL REFERENCES "option_list"("key") ON DELETE CASCADE,
      "value" text NOT NULL,
      "label" text NOT NULL,
      "position" integer NOT NULL DEFAULT 0,
      "isActive" boolean NOT NULL DEFAULT true
    )
  `);

  await db.execute(
    `CREATE UNIQUE INDEX IF NOT EXISTS "option_value_list_position_idx" ON "option_value" ("listKey", "position")`,
  );
  await db.execute(
    `CREATE UNIQUE INDEX IF NOT EXISTS "option_value_list_value_idx" ON "option_value" ("listKey", "value")`,
  );

  await db.execute(`
    CREATE TABLE IF NOT EXISTS "notification_log" (
      "id" text PRIMARY KEY,
      "orderId" text REFERENCES "order"("id") ON DELETE SET NULL,
      "channel" text NOT NULL DEFAULT 'EMAIL',
      "recipient" text NOT NULL,
      "template" text NOT NULL,
      "status" text NOT NULL,
      "error" text,
      "createdAt" timestamp NOT NULL DEFAULT now()
    )
  `);

  await db.execute(
    `CREATE INDEX IF NOT EXISTS "notification_log_order_idx" ON "notification_log" ("orderId")`,
  );
  await db.execute(
    `CREATE INDEX IF NOT EXISTS "notification_log_status_idx" ON "notification_log" ("status")`,
  );

  await db.execute(`
    CREATE TABLE IF NOT EXISTS "audit_log" (
      "id" text PRIMARY KEY,
      "actor" text NOT NULL,
      "action" text NOT NULL,
      "targetType" text NOT NULL,
      "targetId" text,
      "metadata" jsonb,
      "createdAt" timestamp NOT NULL DEFAULT now()
    )
  `);

  await db.execute(
    `CREATE INDEX IF NOT EXISTS "audit_log_action_idx" ON "audit_log" ("action")`,
  );
  await db.execute(
    `CREATE INDEX IF NOT EXISTS "audit_log_target_idx" ON "audit_log" ("targetId")`,
  );

  await db.execute(`
    CREATE TABLE IF NOT EXISTS "rate_limit" (
      "id" text PRIMARY KEY,
      "bucket" text NOT NULL,
      "key" text NOT NULL,
      "count" integer NOT NULL DEFAULT 1,
      "windowStart" timestamp NOT NULL DEFAULT now()
    )
  `);

  await db.execute(
    `CREATE UNIQUE INDEX IF NOT EXISTS "rate_limit_bucket_key_idx" ON "rate_limit" ("bucket", "key")`,
  );

  await db.execute(`
    CREATE TABLE IF NOT EXISTS "site_content" (
      "key" text PRIMARY KEY,
      "value" text NOT NULL,
      "updatedAt" timestamp NOT NULL DEFAULT now()
    )
  `);

  await db.execute(`ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "passwordHash" text`);
  await db.execute(
    `ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "sessionVersion" integer NOT NULL DEFAULT 0`,
  );
  await db.execute(`ALTER TABLE "product" ADD COLUMN IF NOT EXISTS "sourceMl" integer`);
  await db.execute(`ALTER TABLE "product" ADD COLUMN IF NOT EXISTS "remainingMl" integer`);
  await db.execute(
    `ALTER TABLE "promo_setting" ADD COLUMN IF NOT EXISTS "decantPreOrderThresholdMl" integer NOT NULL DEFAULT 10`,
  );

  await db.execute(`
    CREATE TABLE IF NOT EXISTS "email_verification_code" (
      "id" text PRIMARY KEY,
      "identifier" text NOT NULL,
      "purpose" text NOT NULL,
      "tokenHash" text NOT NULL,
      "expiresAt" timestamp NOT NULL,
      "attemptCount" integer NOT NULL DEFAULT 0,
      "consumedAt" timestamp,
      "metadata" jsonb,
      "createdAt" timestamp NOT NULL DEFAULT now()
    )
  `);
  await db.execute(
    `CREATE INDEX IF NOT EXISTS "email_verification_identifier_purpose_idx" ON "email_verification_code" ("identifier", "purpose")`,
  );

  await db.execute(`ALTER TABLE "product" ADD COLUMN IF NOT EXISTS "notePyramid" jsonb`);
  await db.execute(`ALTER TABLE "product" ADD COLUMN IF NOT EXISTS "accords" jsonb`);
  await db.execute(`ALTER TABLE "product" ADD COLUMN IF NOT EXISTS "perfumers" jsonb`);
  await db.execute(`ALTER TABLE "product" ADD COLUMN IF NOT EXISTS "longevity" text`);
  await db.execute(`ALTER TABLE "product" ADD COLUMN IF NOT EXISTS "sillage" text`);
  await db.execute(`ALTER TABLE "product" ADD COLUMN IF NOT EXISTS "priceValue" text`);
  await db.execute(`ALTER TABLE "product" ADD COLUMN IF NOT EXISTS "longevityBreakout" jsonb`);
  await db.execute(`ALTER TABLE "product" ADD COLUMN IF NOT EXISTS "sillageBreakout" jsonb`);
  await db.execute(`ALTER TABLE "product" ADD COLUMN IF NOT EXISTS "priceValueBreakout" jsonb`);
  await db.execute(`ALTER TABLE "product" ADD COLUMN IF NOT EXISTS "seasonBreakout" jsonb`);
  await db.execute(`ALTER TABLE "product" ADD COLUMN IF NOT EXISTS "genderBreakout" jsonb`);
  await db.execute(`ALTER TABLE "product" ADD COLUMN IF NOT EXISTS "relationBreakout" jsonb`);
  await db.execute(`ALTER TABLE "product" ADD COLUMN IF NOT EXISTS "ratingValue" numeric(4,2)`);
  await db.execute(`ALTER TABLE "product" ADD COLUMN IF NOT EXISTS "ratingCount" integer`);
  await db.execute(`ALTER TABLE "product" ADD COLUMN IF NOT EXISTS "reviewsCount" integer`);
  await db.execute(`ALTER TABLE "product" ADD COLUMN IF NOT EXISTS "releaseYear" integer`);
  await db.execute(`ALTER TABLE "product" ADD COLUMN IF NOT EXISTS "gender" text`);
  await db.execute(`ALTER TABLE "product" ADD COLUMN IF NOT EXISTS "fragranticaUrl" text`);
  await db.execute(`ALTER TABLE "product" ADD COLUMN IF NOT EXISTS "fragellaId" text`);
  await db.execute(`ALTER TABLE "product" ADD COLUMN IF NOT EXISTS "fragellaQuery" text`);
  await db.execute(`ALTER TABLE "product" ADD COLUMN IF NOT EXISTS "fragellaFetchedAt" timestamp`);
  await db.execute(`ALTER TABLE "product" ADD COLUMN IF NOT EXISTS "fragellaPayload" jsonb`);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS "fragella_mirror" (
      "id" text PRIMARY KEY,
      "name" text NOT NULL,
      "brand" text NOT NULL,
      "year" integer,
      "gender" text,
      "imageUrl" text,
      "searchName" text NOT NULL,
      "payload" jsonb NOT NULL,
      "requestCount" integer NOT NULL DEFAULT 1,
      "lastFetchedAt" timestamp NOT NULL DEFAULT now(),
      "createdAt" timestamp NOT NULL DEFAULT now(),
      "updatedAt" timestamp NOT NULL DEFAULT now()
    )
  `);
  await db.execute(
    `CREATE INDEX IF NOT EXISTS "fragella_mirror_name_idx" ON "fragella_mirror" ("name")`,
  );
  await db.execute(
    `CREATE INDEX IF NOT EXISTS "fragella_mirror_brand_idx" ON "fragella_mirror" ("brand")`,
  );
  await db.execute(
    `CREATE INDEX IF NOT EXISTS "fragella_mirror_updated_idx" ON "fragella_mirror" ("lastFetchedAt")`,
  );

  await db.execute(`ALTER TABLE "product" ADD COLUMN IF NOT EXISTS "concentration" text`);
  await db.execute(`
    UPDATE "product" SET "concentration" = sub.guessed
    FROM (
      SELECT s."productId" AS id,
        CASE
          WHEN bool_or(s."label" ILIKE '%extrait%') THEN 'EXTRAIT_DE_PARFUM'
          WHEN bool_or(s."label" ILIKE '%eau de parfum%' OR s."label" ILIKE '%edp%') THEN 'EAU_DE_PARFUM'
          WHEN bool_or(s."label" ILIKE '%eau de toilette%' OR s."label" ILIKE '%edt%') THEN 'EAU_DE_TOILETTE'
          WHEN bool_or(s."label" ILIKE '%eau de cologne%' OR s."label" ILIKE '%edc%') THEN 'EAU_DE_COLOGNE'
          WHEN bool_or(s."label" ILIKE '%parfum%') THEN 'PARFUM'
          ELSE NULL
        END AS guessed
      FROM "sku" s
      GROUP BY s."productId"
    ) sub
    WHERE "product"."id" = sub.id AND "product"."concentration" IS NULL AND sub.guessed IS NOT NULL
  `);

  await sqlClient.end({ timeout: 5 });
  console.log("Migration complete");
}

// Rollback for the additive block above (manual):
// ALTER TABLE "user" DROP COLUMN IF EXISTS "passwordHash";
// ALTER TABLE "user" DROP COLUMN IF EXISTS "sessionVersion";
// ALTER TABLE "product" DROP COLUMN IF EXISTS "sourceMl";
// ALTER TABLE "product" DROP COLUMN IF EXISTS "remainingMl";
// ALTER TABLE "promo_setting" DROP COLUMN IF EXISTS "decantPreOrderThresholdMl";
// DROP TABLE IF EXISTS "email_verification_code";

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
