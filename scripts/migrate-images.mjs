// Copy ad images from local disk into Supabase Storage, keeping the same keys.
//
// lib/storage.ts writes to .data/ads when Supabase Storage is not configured.
// That is fine locally, but Vercel's filesystem is ephemeral, so anything
// generated before the move would 404 after a deploy. The database rows already
// hold the keys; this uploads the bytes to match them.
//
//   node scripts/migrate-images.mjs          # report what would happen
//   node scripts/migrate-images.mjs --apply  # actually upload
//
// Safe to re-run: it skips anything already present in the bucket.

import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const LOCAL = join(ROOT, ".data", "ads");
const APPLY = process.argv.includes("--apply");

// Load .env.local the same way the other scripts do.
try {
  for (const line of readFileSync(join(ROOT, ".env.local"), "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
} catch {}

const URL_BASE = (process.env.SUPABASE_URL || "").replace(/\/$/, "");
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BUCKET = process.env.SUPABASE_STORAGE_BUCKET || "ad-images";

if (!URL_BASE || !KEY) {
  console.error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env.local.");
  console.error("Create the bucket first: Supabase dashboard -> Storage -> New bucket -> 'ad-images'.");
  process.exit(1);
}
if (!existsSync(LOCAL)) {
  console.log("No .data/ads directory. Nothing to migrate.");
  process.exit(0);
}

const files = readdirSync(LOCAL).filter((f) => f.endsWith(".png"));
if (!files.length) {
  console.log("No images in .data/ads. Nothing to migrate.");
  process.exit(0);
}

const objectUrl = (key) => `${URL_BASE}/storage/v1/object/${BUCKET}/${key}`;
// Legacy service_role JWTs authenticate via Authorization; newer sb_secret_
// keys are not JWTs and must use apikey. Send both.
const auth = { apikey: KEY, authorization: `Bearer ${KEY}` };

async function exists(key) {
  const r = await fetch(objectUrl(key), { method: "HEAD", headers: auth });
  return r.ok;
}

console.log(`${files.length} image(s) in .data/ads -> bucket "${BUCKET}"`);
console.log(APPLY ? "Uploading.\n" : "Dry run. Pass --apply to upload.\n");

let up = 0, skip = 0, failed = 0;
for (const key of files) {
  try {
    if (await exists(key)) {
      console.log(`  = already in bucket  ${key}`);
      skip++;
      continue;
    }
    if (!APPLY) {
      console.log(`  + would upload       ${key}`);
      up++;
      continue;
    }
    const body = readFileSync(join(LOCAL, key));
    const r = await fetch(objectUrl(key), {
      method: "POST",
      headers: { ...auth, "content-type": "image/png", "cache-control": "public, max-age=31536000, immutable" },
      body: new Uint8Array(body),
    });
    if (!r.ok) throw new Error(`HTTP ${r.status} ${(await r.text()).slice(0, 160)}`);
    console.log(`  + uploaded           ${key}  (${(body.length / 1024).toFixed(0)} KB)`);
    up++;
  } catch (e) {
    console.error(`  ! failed             ${key}  ${e.message}`);
    failed++;
  }
}

console.log(`\n${APPLY ? "Uploaded" : "Would upload"} ${up}, skipped ${skip}, failed ${failed}.`);
if (failed) process.exitCode = 1;
else if (APPLY) console.log("Done. The deployed app will now serve these from Storage.");
