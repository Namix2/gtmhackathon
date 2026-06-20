import type { FeedItem, FeedSource } from "../types";
import {
  classifyAiSlopFrustration,
  type AiSlopFrustrationResult,
} from "./ai-slop-frustration";
import { classifyIcp, type IcpClassificationResult } from "./icp-classifier";
import { URGENCY_PHRASES, countMatches } from "./dictionaries";
import { ageHours, freshnessMultiplier, recencyScore } from "./freshness";
import { clamp } from "./util";

// Precomputed, deterministic features for one item. Every scorer reads from this
// so an item's text is classified exactly once per scoring pass.

export interface ItemFeatures {
  text: string;
  contentLength: number;
  tags: string[];
  aiSlop: AiSlopFrustrationResult;
  icp: IcpClassificationResult;
  urgencyMatches: string[];
  recency: number;
  freshness: number;
  ageHours: number;
  platform: string;
  hasAuthor: boolean;
  reachableSource: number;
}

function reachableSourceScore(source?: FeedSource): number {
  if (!source) return 0.6;
  switch (source.sourceType) {
    case "native_rss":
    case "rsshub":
    case "rssbridge":
    case "rss_app":
      return 1;
    case "manual":
      return 0.6;
    default:
      return 0.6;
  }
}

export function buildFeatures(
  item: FeedItem,
  source: FeedSource | undefined,
  now: Date,
  windowDays: number
): ItemFeatures {
  const text = `${item.title} ${item.summary ?? ""} ${item.contentText ?? ""}`;
  const lower = text.toLowerCase();
  return {
    text: lower,
    contentLength: (item.contentText ?? item.summary ?? "").length,
    tags: item.tags,
    aiSlop: classifyAiSlopFrustration(text),
    icp: classifyIcp(text),
    urgencyMatches: countMatches(lower, URGENCY_PHRASES),
    recency: recencyScore(item.publishedAt, now, windowDays),
    freshness: freshnessMultiplier(ageHours(item.publishedAt, now)),
    ageHours: ageHours(item.publishedAt, now),
    platform: item.platform,
    hasAuthor: Boolean(item.author),
    reachableSource: reachableSourceScore(source),
  };
}

export function problemSpecificityScore(features: ItemFeatures): number {
  return clamp(
    features.aiSlop.matchedPhrases.length * 0.25 + features.tags.length * 0.1
  );
}

export function actionabilityScore(features: ItemFeatures): number {
  return clamp(features.urgencyMatches.length * 0.34);
}

export function commercialUrgencyScore(features: ItemFeatures): number {
  return clamp(features.urgencyMatches.length * 0.34 + features.aiSlop.score * 0.2);
}
