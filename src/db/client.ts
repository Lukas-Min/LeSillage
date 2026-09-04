import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { getEnv } from "@/lib/env";
import * as schema from "./schema";

const globalForDb = globalThis as unknown as {
  __leSillagePg?: ReturnType<typeof postgres>;
  __leSillageDb?: ReturnType<typeof buildDb>;
};

function getSql() {
  if (!globalForDb.__leSillagePg) {
    const env = getEnv();
    globalForDb.__leSillagePg = postgres(env.DATABASE_URL, {
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
  }
  return globalForDb.__leSillagePg;
}

function buildDb() {
  return drizzle(getSql(), { schema });
}

export function db() {
  // Memoized next to the client: drizzle() rebuilds its query builder and
  // relation maps on every call, and db() is called several times per
  // request.
  if (!globalForDb.__leSillageDb) globalForDb.__leSillageDb = buildDb();
  return globalForDb.__leSillageDb;
}

export type Db = ReturnType<typeof db>;
export { schema };
