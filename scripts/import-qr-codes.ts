/**
 * One-time load of the user's real payment QR codes (MariBank, BPI, GCash)
 * into `qr_code`, replacing the seeded placeholder BPI/GCash rows and adding
 * a new MariBank row. Images already committed as static files under
 * public/qr/ — referenced directly by path rather than pushed through the
 * admin upload's blob-storage flow (BLOB_READ_WRITE_TOKEN isn't configured
 * locally, and a static public/ path is simpler and matches how the seeded
 * placeholder QR images already worked).
 *
 * Usage: npx tsx scripts/import-qr-codes.ts
 * Safe to re-run: updates existing rows by bankName instead of duplicating.
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { and, eq, ilike } from "drizzle-orm";
import { db } from "../src/db/client";
import { qrCodes } from "../src/db/schema";

interface QrEntry {
  bankName: string;
  accountName: string;
  accountNumber: string;
  imageUrl: string;
  position: number;
}

const ENTRIES: QrEntry[] = [
  {
    bankName: "BPI",
    accountName: "Lukas",
    accountNumber: "xxxxxxxxxxx588",
    imageUrl: "/qr/fade0f5c-ecf3-44b9-8062-b58d80098bf0-1_all_1452.png",
    position: 0,
  },
  {
    bankName: "GCash",
    accountName: "JU***S CA***R M.",
    accountNumber: "097• ••••959",
    imageUrl: "/qr/331.jpeg",
    position: 1,
  },
  {
    bankName: "MariBank",
    accountName: "Julius Caesar Moraleta",
    accountNumber: "****1569",
    imageUrl: "/qr/fade0f5c-ecf3-44b9-8062-b58d80098bf0-1_all_7817.png",
    position: 2,
  },
];

async function main() {
  const client = db();
  for (const entry of ENTRIES) {
    const [existing] = await client
      .select({ id: qrCodes.id })
      .from(qrCodes)
      .where(and(ilike(qrCodes.bankName, entry.bankName)))
      .limit(1);
    if (existing) {
      await client
        .update(qrCodes)
        .set({
          accountName: entry.accountName,
          accountNumber: entry.accountNumber,
          imageUrl: entry.imageUrl,
          position: entry.position,
          isActive: true,
        })
        .where(eq(qrCodes.id, existing.id));
      console.log(`✓ Updated ${entry.bankName}`);
    } else {
      await client.insert(qrCodes).values({
        bankName: entry.bankName,
        accountName: entry.accountName,
        accountNumber: entry.accountNumber,
        imageUrl: entry.imageUrl,
        position: entry.position,
        isActive: true,
      });
      console.log(`✓ Inserted ${entry.bankName}`);
    }
  }
  console.log("\nDone.");
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
