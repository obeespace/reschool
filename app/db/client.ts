import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

// Singleton pool — reused across hot-reloads in dev and across requests in prod
let _pool: Pool | null = null;

function getPool(): Pool {
  if (!_pool) {
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL environment variable is not set.");
    }
    _pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
      max: 10,
    });
  }
  return _pool;
}

export type D1Client = NodePgDatabase;

export function createDbClient(): D1Client {
  return drizzle(getPool());
}

// Keep the old name as an alias so existing imports don't break
export const createD1Client = createDbClient;
