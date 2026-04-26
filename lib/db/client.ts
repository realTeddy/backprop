import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

// Lazy: no work at import time. Throws only when a caller actually asks
// for the client without a configured connection string. Lets routes that
// don't touch raw Drizzle (most of them — they go through Supabase JS) be
// imported safely on a Vercel deploy that hasn't wired DATABASE_URL yet.
let _db: ReturnType<typeof drizzle> | null = null;

export function getDb() {
  if (_db) return _db;
  const connectionString =
    process.env.POSTGRES_URL ??
    process.env.POSTGRES_URL_NON_POOLING ??
    process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      "POSTGRES_URL / POSTGRES_URL_NON_POOLING / DATABASE_URL must be set",
    );
  }
  const queryClient = postgres(connectionString, { prepare: false });
  _db = drizzle(queryClient, { schema });
  return _db;
}

export type Db = ReturnType<typeof getDb>;
