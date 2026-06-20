// Canonical domain types for the RSS Engine.
//
// These mirror the entities defined in 00_rss_engine_overview.md. Every external
// source — Reddit, Substack, Hacker News, blogs, news — is normalised into these
// shapes before any classification, scoring, or storage happens. Downstream code
// must never need to know the original platform beyond the `platform` tag.

export type SourceType =
  | "native_rss"
  | "rsshub"
  | "rssbridge"
  | "rss_app"
  | "manual";

export type OriginalPlatform =
  | "substack"
  | "reddit"
  | "hackernews"
  | "blog"
  | "news"
  | "unknown";

export type IcpCategory = "persuader" | "evaluator" | "unknown";

export type DateCategory = "recent" | "trending" | "evergreen";

export type QueryCategory =
  | "pain_signals"
  | "icp_persuaders"
  | "icp_evaluators"
  | "source_discovery"
  | string;

export type SearchProviderName = "exa" | "tavily";

export interface FeedSource {
  id: string;
  sourceType: SourceType;
  originalPlatform: OriginalPlatform;
  feedUrl: string;
  homepageUrl?: string;
  title?: string;
  queryCategory?: string;
  dateCategory?: string;
  pollingIntervalMinutes: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  // Operational metadata used by the polling policy (not part of the spec
  // entity, but needed to implement the documented polling rules).
  lastPolledAt?: string;
  lastItemAt?: string;
  // Traceability: the query that discovered this source (acceptance criteria
  // in 08_internal_api_contracts.md).
  discoveredByQuery?: string;
}

export interface FeedItem {
  id: string;
  feedSourceId: string;
  url: string;
  canonicalUrl: string;
  title: string;
  summary?: string;
  contentText?: string;
  author?: string;
  publishedAt?: string;
  discoveredAt: string;
  platform: string;
  tags: string[];
  contentHash: string;
  externalId?: string;
}

export interface ScoredSignal {
  itemId: string;
  icpCategory: IcpCategory;
  painSignalScore: number;
  aiSlopFrustrationScore: number;
  authorityScore: number;
  visibilityScore: number;
  championScore: number;
  priorityScore: number;
  rationale: string[];
  scoredAt: string;
  // Extra fields preserved for retrieval/filtering. Kept optional so the core
  // ScoredSignal contract from the overview stays intact.
  queryCategory?: string;
  icpRole?: string;
}

// A raw item produced by the feed parser before canonicalisation.
export interface ParsedFeedItem {
  title?: string;
  link?: string;
  guid?: string;
  isoDate?: string;
  pubDate?: string;
  creator?: string;
  author?: string;
  summary?: string;
  content?: string;
  contentSnippet?: string;
  contentEncoded?: string;
  categories?: string[];
}

export interface ParsedFeed {
  title?: string;
  link?: string;
  description?: string;
  items: ParsedFeedItem[];
}
