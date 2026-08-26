import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { getEnv } from "@/lib/env";
import * as schema from "./schema";

const globalForDb = globalThis as unknown as {
  __leSillagePg?: ReturnType<typeof postgres>;
};

function getSql() {
  if (!globalForDb.__leSillagePg) {
    const env = getEnv();
    globalForDb.__leSillagePg = postgres(env.DATABASE_URL, { prepare: false });
  }
  return globalForDb.__leSillagePg;
}

export function db() {
  return drizzle(getSql(), { schema });
}

export type Db = ReturnType<typeof db>;
export { schema };
