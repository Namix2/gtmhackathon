import type { DateCategory, FeedSource } from "../types";

// Adaptive polling intervals per date category (rules from specs 01/02/03).
// Deterministic: given a source and recent activity stats, returns the next
// interval in minutes.

export interface PollingStats {
  highScoringCount7d: number;
  hasHighPriority48h: boolean;
  daysSinceLastRelevantItem: number;
}

const BASE_INTERVAL: Record<DateCategory, number> = {
  recent: 60,
  trending: 180,
  evergreen: 720,
};

export function baseIntervalFor(dateCategory?: string): number {
  if (dateCategory && dateCategory in BASE_INTERVAL) {
    return BASE_INTERVAL[dateCategory as DateCategory];
  }
  return 60;
}

export function nextPollIntervalMinutes(
  source: FeedSource,
  stats: PollingStats
): number {
  const category = (source.dateCategory ?? "recent") as DateCategory;
  const base = BASE_INTERVAL[category] ?? source.pollingIntervalMinutes ?? 60;

  switch (category) {
    case "recent":
      if (stats.highScoringCount7d >= 3) return 30;
      if (stats.daysSinceLastRelevantItem >= 14) return 360;
      return base;
    case "trending":
      if (stats.hasHighPriority48h) return 60; // promote toward recent monitoring
      return base;
    case "evergreen":
      if (stats.hasHighPriority48h) return 180;
      if (stats.daysSinceLastRelevantItem >= 90) return 10080; // weekly
      return base;
    default:
      return base;
  }
}

export function computeNextPollAt(now: Date, intervalMinutes: number): string {
  return new Date(now.getTime() + intervalMinutes * 60_000).toISOString();
}
