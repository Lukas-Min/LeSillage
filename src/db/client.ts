import { Pool, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import { getEnv } from "@/lib/env";
import * as schema from "./schema";

const globalForDb = globalThis as unknown as {
  __leSillagePool?: Pool;
  __leSillageDb?: ReturnType<typeof drizzle<typeof schema>>;
};

function getPool(): Pool {
  if (!globalForDb.__leSillagePool) {
    const env = getEnv();
    globalForDb.__leSillagePool = new Pool({ connectionString: env.DATABASE_URL });
  }
  return globalForDb.__leSillagePool;
}

export function db() {
  if (!globalForDb.__leSillageDb) {
    const pool = getPool();
    globalForDb.__leSillageDb = drizzle(pool, { schema });
  }
  return globalForDb.__leSillageDb;
}

export type Db = ReturnType<typeof db>;
export { schema, neonConfig };
