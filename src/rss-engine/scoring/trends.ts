import type { FeedItem, ScoredSignal } from "../types";
import { classifyAiSlopFrustration } from "./ai-slop-frustration";
import { ageHours, freshnessMultiplier } from "./freshness";
import { round } from "./util";

// Trend clustering (02_date_category_trending.md). Deterministic clustering by
// phrase: each item contributes its tags and matched AI-slop phrases. Source
// diversity (uniqueSourceCount) is part of the trend score and a hard filter, so
// one noisy source cannot manufacture a trend.

export interface TrendCluster {
  phrase: string;
  itemCount: number;
  uniqueSourceCount: number;
  averagePriorityScore: number;
  firstSeenAt: string;
  latestSeenAt: string;
  trendScore: number;
  representativeItemIds: string[];
}

export interface TrendInput {
  signal: ScoredSignal;
  item: FeedItem;
}

export interface ComputeTrendsOptions {
  minSources?: number;
  minScore?: number;
  now?: Date;
}

interface Accumulator {
  phrase: string;
  itemIds: string[];
  sourceIds: Set<string>;
  prioritySum: number;
  firstSeen: number;
  latestSeen: number;
}

function phrasesForItem(item: FeedItem): string[] {
  const text = `${item.title} ${item.summary ?? ""} ${item.contentText ?? ""}`;
  const aiSlop = classifyAiSlopFrustration(text);
  return [...new Set([...item.tags, ...aiSlop.matchedPhrases])];
}

export function computeTrends(
  inputs: TrendInput[],
  options: ComputeTrendsOptions = {}
): TrendCluster[] {
  const minSources = options.minSources ?? 3;
  const minScore = options.minScore ?? 0.65;
  const now = options.now ?? new Date();

  const clusters = new Map<string, Accumulator>();

  for (const { signal, item } of inputs) {
    const when = new Date(item.publishedAt ?? item.discoveredAt).getTime();
    for (const phrase of phrasesForItem(item)) {
      let acc = clusters.get(phrase);
      if (!acc) {
        acc = {
          phrase,
          itemIds: [],
          sourceIds: new Set(),
          prioritySum: 0,
          firstSeen: when,
          latestSeen: when,
        };
        clusters.set(phrase, acc);
      }
      acc.itemIds.push(item.id);
      acc.sourceIds.add(item.feedSourceId);
      acc.prioritySum += signal.priorityScore;
      acc.firstSeen = Math.min(acc.firstSeen, when);
      acc.latestSeen = Math.max(acc.latestSeen, when);
    }
  }

  const result: TrendCluster[] = [];
  for (const acc of clusters.values()) {
    const itemCount = acc.itemIds.length;
    const uniqueSourceCount = acc.sourceIds.size;
    const averagePriorityScore = acc.prioritySum / itemCount;

    if (uniqueSourceCount < minSources) continue;
    if (averagePriorityScore < minScore) continue;

    const freshness = freshnessMultiplier(
      ageHours(new Date(acc.latestSeen).toISOString(), now)
    );
    const trendScore =
      Math.log(1 + itemCount) *
      Math.log(1 + uniqueSourceCount) *
      averagePriorityScore *
      freshness;

    result.push({
      phrase: acc.phrase,
      itemCount,
      uniqueSourceCount,
      averagePriorityScore: round(averagePriorityScore),
      firstSeenAt: new Date(acc.firstSeen).toISOString(),
      latestSeenAt: new Date(acc.latestSeen).toISOString(),
      trendScore: round(trendScore),
      representativeItemIds: acc.itemIds.slice(0, 5),
    });
  }

  result.sort((a, b) => b.trendScore - a.trendScore);
  return result;
}
