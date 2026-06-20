import { clamp } from "./util";

// Freshness multiplier from 01_date_category_recent.md. Recent items get a
// scoring boost; older items are neutral (never penalised below 1.0).
export function freshnessMultiplier(ageHours: number): number {
  if (ageHours <= 24) return 1.25;
  if (ageHours <= 72) return 1.15;
  if (ageHours <= 168) return 1.05;
  return 1.0;
}

export function ageHours(publishedAt: string | undefined, now: Date): number {
  if (!publishedAt) return Number.POSITIVE_INFINITY;
  const ts = new Date(publishedAt).getTime();
  if (Number.isNaN(ts)) return Number.POSITIVE_INFINITY;
  return Math.max(0, (now.getTime() - ts) / 3_600_000);
}

// Linear recency score within a date window: 1.0 when fresh, decaying to 0 at
// the window edge. Items with no/invalid date score 0.
export function recencyScore(
  publishedAt: string | undefined,
  now: Date,
  windowDays: number
): number {
  const hours = ageHours(publishedAt, now);
  if (!Number.isFinite(hours)) return 0;
  const windowHours = windowDays * 24;
  return clamp(1 - hours / windowHours);
}
