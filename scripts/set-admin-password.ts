import { config } from "dotenv";
config({ path: ".env.local" });

import { eq } from "drizzle-orm";
import { db } from "../src/db/client";
import { users } from "../src/db/schema";
import { getEnv } from "../src/lib/env";
import { hashPassword, validatePassword } from "../src/lib/password";

async function main() {
  const env = getEnv();
  const email = env.ADMIN_EMAIL.toLowerCase();
  const password = env.ADMIN_PASSWORD;
  const passwordError = validatePassword(password);
  if (passwordError) throw new Error(`ADMIN_PASSWORD is not usable: ${passwordError}`);

  const client = db();
  const passwordHash = await hashPassword(password);
  const existing = (await client.select().from(users).where(eq(users.email, email)))[0];

  if (existing) {
    await client
      .update(users)
      .set({ passwordHash, role: "ADMIN", emailVerified: existing.emailVerified ?? new Date() })
      .where(eq(users.id, existing.id));
    console.log(`Updated password for existing admin user: ${email}`);
  } else {
    await client.insert(users).values({
      name: "Le Sillage",
      email,
      passwordHash,
      role: "ADMIN",
      emailVerified: new Date(),
    });
    console.log(`Created admin user: ${email}`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
