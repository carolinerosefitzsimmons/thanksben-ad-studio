// Spend controls. Every ad is a billable gpt-image-2 render, and the fan-out is
// chosen by whoever is using the studio, so both the per-request and the per-day
// counts are capped. Defaults are deliberately low; raise them with intent.

import { query } from "./db";

function num(name: string, fallback: number): number {
  const raw = process.env[name];
  const n = raw ? Number(raw) : NaN;
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
}

export const maxAdsPerRequest = () => num("MAX_ADS_PER_REQUEST", 4);
export const dailyAdLimit = () => num("DAILY_AD_LIMIT", 50);

export interface Budget {
  usedToday: number;
  limit: number;
  remaining: number;
}

/** Ads rendered since midnight UTC, against the daily cap. */
export async function budget(): Promise<Budget> {
  const limit = dailyAdLimit();
  const { rows } = await query<{ n: string }>(
    `select count(*)::text as n from tb_ads where created_at >= date_trunc('day', now() at time zone 'utc')`,
  );
  const usedToday = Number(rows[0]?.n ?? 0);
  return { usedToday, limit, remaining: Math.max(0, limit - usedToday) };
}

/**
 * Check a request that is about to render `wanted` images. Returns an error string
 * to refuse with, or null to proceed.
 */
export async function checkBudget(wanted: number): Promise<string | null> {
  const perRequest = maxAdsPerRequest();
  if (wanted > perRequest) {
    return `That would render ${wanted} images in one request; the limit is ${perRequest}. Select fewer markets, or raise MAX_ADS_PER_REQUEST.`;
  }
  const b = await budget();
  if (b.remaining < wanted) {
    return `Daily image budget reached: ${b.usedToday} of ${b.limit} used today, ${b.remaining} left but ${wanted} requested. Raise DAILY_AD_LIMIT or try tomorrow.`;
  }
  return null;
}
