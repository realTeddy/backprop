import "dotenv/config";
import type { Config } from "drizzle-kit";

// Prefer the direct (non-pooling) URL so DDL works. Vercel's Supabase
// integration sets POSTGRES_URL_NON_POOLING; locally you can keep using
// DATABASE_URL.
const url =
  process.env.POSTGRES_URL_NON_POOLING ??
  process.env.DATABASE_URL ??
  "";

export default {
  schema: "./lib/db/schema.ts",
  out: "./lib/db/migrations",
  dialect: "postgresql",
  dbCredentials: { url },
  verbose: true,
  strict: true,
} satisfies Config;
