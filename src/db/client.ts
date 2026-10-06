import { attachDatabasePool } from "@vercel/functions";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool, type PoolConfig } from "pg";
import { getEnv } from "@/lib/env";
import * as schema from "./schema";

const globalForDb = globalThis as unknown as {
  __leSillageDb?: ReturnType<typeof drizzle<typeof schema>>;
};

/**
 * TLS settings from the URL's sslmode, matching what postgres.js (the old
 * driver) did: require/prefer/allow encrypt without checking the certificate,
 * verify-* checks it, and no sslmode (or disable) connects in plain text. pg
 * on its own reads sslmode=require as verify-full, which Supabase's own
 * certificate authority fails, so sslmode is taken off the URL and set here.
 */
export function poolConfigFromUrl(databaseUrl: string): Pick<PoolConfig, "connectionString" | "ssl"> {
  const url = new URL(databaseUrl);
  const sslmode = url.searchParams.get("sslmode");
  url.searchParams.delete("sslmode");
  const ssl =
    sslmode === null || sslmode === "disable"
      ? false
      : sslmode === "require" || sslmode === "prefer" || sslmode === "allow"
        ? { rejectUnauthorized: false }
        : true;
  return { connectionString: url.toString(), ssl };
}

export function db() {
  // Memoized once, on a single global slot: drizzle() rebuilds its query
  // builder and relation maps on every call and db() is called several
  // times per request, and re-running new Pool() would rebuild the
  // connection pool itself. One slot also means there's no half-initialized
  // state to reach (a pool with no way back to it) if construction throws
  // partway through.
  if (!globalForDb.__leSillageDb) {
    const env = getEnv();
    const pool = new Pool({
      ...poolConfigFromUrl(env.DATABASE_URL),
      // 5 covers the Promise.all fan-outs in the dashboard, catalog and cart
      // loaders without each warm instance squatting many pooler slots.
      max: 5,
      // Short, because attachDatabasePool keeps the instance awake until idle
      // connections close: a connection must never sit idle through a
      // suspension, or it comes back dead and the next query hangs.
      idleTimeoutMillis: 5_000,
      connectionTimeoutMillis: 10_000,
      // A query that never gets an answer fails here instead of holding the
      // page open until Vercel kills the function at 300s.
      query_timeout: 30_000,
      keepAlive: true,
    });
    // An idle connection the server drops emits "error" on the pool; with no
    // listener that would crash the instance. The pool already discards it.
    pool.on("error", (error) => console.error("[db] idle connection error", error));
    attachDatabasePool(pool);
    globalForDb.__leSillageDb = drizzle({ client: pool, schema });
  }
  return globalForDb.__leSillageDb;
}

export type Db = ReturnType<typeof db>;
export { schema };
