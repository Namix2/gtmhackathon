import type { TrendCluster } from "../types";
import { freshnessMultiplier } from "./freshness";

export function computeTrendClusters(
  items: {
    id: string;
    feedSourceId: string;
    phrase: string;
    priorityScore: number;
    publishedAt?: Date | null;
  }[],
  windowDays: number
): TrendCluster[] {
  const cutoff = Date.now() - windowDays * 24 * 60 * 60 * 1000;
  const byPhrase = new Map<
    string,
    {
      itemCount: number;
      sources: Set<string>;
      scores: number[];
      firstSeenAt: Date;
      latestSeenAt: Date;
      itemIds: string[];
    }
  >();

  for (const item of items) {
    const published = item.publishedAt?.getTime() ?? Date.now();
    if (published < cutoff) continue;

    const key = item.phrase.toLowerCase();
    let cluster = byPhrase.get(key);
    if (!cluster) {
      cluster = {
        itemCount: 0,
        sources: new Set(),
        scores: [],
        firstSeenAt: item.publishedAt ?? new Date(),
        latestSeenAt: item.publishedAt ?? new Date(),
        itemIds: [],
      };
      byPhrase.set(key, cluster);
    }

    cluster.itemCount += 1;
    cluster.sources.add(item.feedSourceId);
    cluster.scores.push(item.priorityScore);
    cluster.itemIds.push(item.id);
    const at = item.publishedAt ?? new Date();
    if (at < cluster.firstSeenAt) cluster.firstSeenAt = at;
    if (at > cluster.latestSeenAt) cluster.latestSeenAt = at;
  }

  return Array.from(byPhrase.entries()).map(([phrase, cluster]) => {
    const averagePriorityScore =
      cluster.scores.reduce((a, b) => a + b, 0) / cluster.scores.length;
    const ageHours =
      (Date.now() - cluster.latestSeenAt.getTime()) / (1000 * 60 * 60);
    const trendScore =
      Math.log(1 + cluster.itemCount) *
      Math.log(1 + cluster.sources.size) *
      averagePriorityScore *
      freshnessMultiplier(ageHours);

    return {
      phrase,
      itemCount: cluster.itemCount,
      uniqueSourceCount: cluster.sources.size,
      averagePriorityScore,
      firstSeenAt: cluster.firstSeenAt.toISOString(),
      latestSeenAt: cluster.latestSeenAt.toISOString(),
      trendScore,
      representativeItemIds: cluster.itemIds.slice(0, 5),
    };
  });
}
