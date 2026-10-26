import { Pool } from "pg";
import { readFileSync } from "node:fs";
import { join } from "node:path";

let pool: Pool | null = null;
let schemaReady: Promise<void> | null = null;

export function getPool(): Pool {
  if (!pool) {
    const cs = process.env.SUPABASE_DB_URL;
    if (!cs) throw new Error("SUPABASE_DB_URL not set");
    pool = new Pool({ connectionString: cs, ssl: { rejectUnauthorized: false }, max: 4 });
  }
  return pool;
}

/** Idempotently ensure our tables exist (runs once per server process). */
export function ensureSchema(): Promise<void> {
  if (!schemaReady) {
    schemaReady = (async () => {
      const sql = readFileSync(join(process.cwd(), "supabase", "schema.sql"), "utf8");
      await getPool().query(sql);
    })().catch((e) => {
      schemaReady = null; // allow retry on next request if it failed
      throw e;
    });
  }
  return schemaReady;
}

export async function query<T = any>(text: string, params?: unknown[]): Promise<{ rows: T[] }> {
  await ensureSchema();
  const res = await getPool().query(text, params);
  return { rows: res.rows as T[] };
}
