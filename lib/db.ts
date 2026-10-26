import { Pool } from "pg";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

let pool: Pool | null = null;
let schemaReady: Promise<void> | null = null;

/**
 * TLS settings for the connection.
 *
 * Supabase signs its database certificates with its own private root ("Supabase
 * Root 2021 CA"), which is not in any public trust store — so plain verification
 * fails with SELF_SIGNED_CERT_IN_CHAIN. The prototype's answer was
 * rejectUnauthorized:false, which accepts *any* certificate and gives up on
 * authenticating the server at all.
 *
 * Instead we pin Supabase's published root (supabase/prod-ca-2021.crt, downloaded
 * from supabase-downloads.s3.amazonaws.com and checked against the chain the
 * pooler serves). Verification stays on; only the trust anchor changes.
 *
 * PGSSL_CA   — path to a different CA bundle, for a non-Supabase Postgres.
 * PGSSL_NO_VERIFY=1 — last resort; disables verification and says so loudly.
 */
function sslConfig(connectionString: string) {
  if (process.env.PGSSL_NO_VERIFY === "1") {
    console.error("[db] PGSSL_NO_VERIFY=1 — the database certificate is NOT being verified.");
    return { rejectUnauthorized: false };
  }

  const custom = process.env.PGSSL_CA;
  if (custom) return { rejectUnauthorized: true, ca: readFileSync(custom, "utf8") };

  const bundled = join(process.cwd(), "supabase", "prod-ca-2021.crt");
  if (/supabase\.(com|co|net)/i.test(connectionString) && existsSync(bundled)) {
    return { rejectUnauthorized: true, ca: readFileSync(bundled, "utf8") };
  }

  return { rejectUnauthorized: true };
}

export function getPool(): Pool {
  if (!pool) {
    const cs = process.env.SUPABASE_DB_URL;
    if (!cs) throw new Error("SUPABASE_DB_URL not set");
    pool = new Pool({ connectionString: cs, ssl: sslConfig(cs), max: 4 });
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
