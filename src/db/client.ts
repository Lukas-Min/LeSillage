import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { getEnv } from "@/lib/env";
import * as schema from "./schema";

const globalForDb = globalThis as unknown as {
  __leSillageDb?: ReturnType<typeof drizzle<typeof schema>>;
};

export function db() {
  // Memoized once, on a single global slot: drizzle() rebuilds its query
  // builder and relation maps on every call and db() is called several
  // times per request, and re-running postgres() would rebuild the
  // connection pool itself. One slot also means there's no half-initialized
  // state to reach (a pool with no way back to it) if construction throws
  // partway through.
  if (!globalForDb.__leSillageDb) {
    const env = getEnv();
    const sql = postgres(env.DATABASE_URL, {
      // Supabase's transaction-mode pooler (port 6543) can't keep named
      // prepared statements across queries.
      prepare: false,
      // postgres.js defaults to max: 10 and idle_timeout: 0 (never close), so
      // every warm-but-idle serverless instance would squat 10 pooler slots
      // indefinitely. 5 covers the Promise.all fan-outs in the catalog and
      // cart loaders; idle connections are handed back after 20s.
      max: 5,
      idle_timeout: 20,
      max_lifetime: 60 * 30,
      connect_timeout: 10,
    });
    globalForDb.__leSillageDb = drizzle(sql, { schema });
  }
  return globalForDb.__leSillageDb;
}

export type Db = ReturnType<typeof db>;
export { schema };
