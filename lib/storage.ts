// Ad image storage. The prototype kept PNGs as base64 text in Postgres and served
// them as data URIs — multi-megabyte rows, no caching, and a history endpoint that
// grew without bound. Images now live in object storage and are served through
// /api/ads/[id], so the driver below can change without touching the rest of the app.
//
// Driver selection is automatic:
//   SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY set -> Supabase Storage
//   otherwise                                    -> local disk under .data/ads
// Local is intended for development. It is process-local, so it will not work
// across instances in production; the app warns once at startup if it is in use.

import { mkdir, readFile, writeFile, unlink } from "node:fs/promises";
import { join } from "node:path";
import { randomUUID } from "node:crypto";

const BUCKET = process.env.SUPABASE_STORAGE_BUCKET || "ad-images";
const LOCAL_DIR = join(process.cwd(), ".data", "ads");

export type Driver = "supabase" | "local";

export function driver(): Driver {
  return process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY ? "supabase" : "local";
}

let warned = false;
function warnOnce(): void {
  if (warned || driver() !== "local") return;
  warned = true;
  if (process.env.NODE_ENV === "production") {
    console.error(
      "[storage] Using LOCAL disk for ad images in production. Images will not be shared " +
        "between instances and will be lost on redeploy. Set SUPABASE_URL and " +
        "SUPABASE_SERVICE_ROLE_KEY to use object storage.",
    );
  }
}

function supabaseUrl(key: string): string {
  return `${process.env.SUPABASE_URL!.replace(/\/$/, "")}/storage/v1/object/${BUCKET}/${key}`;
}

/** Store a PNG and return the opaque key to persist on the ad row. */
export async function putAd(png: Buffer): Promise<string> {
  warnOnce();
  const key = `${randomUUID()}.png`;

  if (driver() === "supabase") {
    const res = await fetch(supabaseUrl(key), {
      method: "POST",
      headers: {
        authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        "content-type": "image/png",
        "cache-control": "public, max-age=31536000, immutable",
      },
      body: new Uint8Array(png),
    });
    if (!res.ok) {
      throw new Error(`storage: Supabase upload failed (HTTP ${res.status}) — ${(await res.text()).slice(0, 200)}`);
    }
    return key;
  }

  await mkdir(LOCAL_DIR, { recursive: true });
  await writeFile(join(LOCAL_DIR, key), png);
  return key;
}

/** Read a stored PNG back. Returns null if the key is unknown. */
export async function getAd(key: string): Promise<Buffer | null> {
  if (!key || key.includes("/") || key.includes("..")) return null;

  if (driver() === "supabase") {
    const res = await fetch(supabaseUrl(key), {
      headers: { authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}` },
    });
    if (!res.ok) return null;
    return Buffer.from(await res.arrayBuffer());
  }

  try {
    return await readFile(join(LOCAL_DIR, key));
  } catch {
    return null;
  }
}

/** Best-effort delete, used when an ad is replaced by a remix. Never throws. */
export async function deleteAd(key: string | null | undefined): Promise<void> {
  if (!key || key.includes("/") || key.includes("..")) return;
  try {
    if (driver() === "supabase") {
      await fetch(supabaseUrl(key), {
        method: "DELETE",
        headers: { authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}` },
      });
    } else {
      await unlink(join(LOCAL_DIR, key));
    }
  } catch {
    /* an orphaned image is not worth failing a request over */
  }
}
