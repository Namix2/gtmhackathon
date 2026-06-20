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
  | "youtube"
  | "podcast"
  | "unknown";

export type DateCategory = "recent" | "trending" | "evergreen";

export type QueryCategory =
  | "pain_signals"
  | "icp_persuaders"
  | "icp_evaluators"
  | "source_discovery";

export type FeedResolutionStrategy =
  | "native_then_rsshub_then_rssbridge"
  | "native_then_rsshub_then_rssbridge_then_rss_app";

export type FeedResolutionRejectionReason =
  | "no_feed_found"
  | "requires_authentication"
  | "paywalled"
  | "blocked_by_robots"
  | "unsupported_platform"
  | "invalid_url"
  | "feed_validation_failed";

export type FeedCandidate = {
  sourceType: SourceType;
  feedUrl: string;
  confidence: number;
};

export type FeedRejection = {
  sourceType?: SourceType;
  reason: FeedResolutionRejectionReason;
  detail?: string;
};

export type DiscoveryProvider = "exa" | "tavily";

export type DiscoveryResultItem = {
  provider: DiscoveryProvider;
  url: string;
  title?: string;
  summary?: string;
  publishedAt?: string;
  platformHint: OriginalPlatform;
  feedCandidates: FeedCandidate[];
};

export type IcpCategory = "persuader" | "evaluator" | "unknown";

export type PersuaderRole =
  | "founder"
  | "sales_leader"
  | "recruiter"
  | "growth_operator"
  | "fundraiser"
  | "unknown";

export type EvaluatorRole =
  | "investor"
  | "buyer"
  | "hiring_manager"
  | "journalist"
  | "moderator"
  | "unknown";

export type IcpClassification = {
  category: IcpCategory;
  role: PersuaderRole | EvaluatorRole | "unknown";
  confidence: number;
  evidence: string[];
};

export type AiSlopFrustrationResult = {
  score: number;
  matchedPhrases: string[];
  sentiment: "negative" | "neutral" | "positive";
  frustrationType:
    | "inbox_noise"
    | "generic_content"
    | "trust_decay"
    | "screening_burden"
    | "unknown";
};

export type ScoredSignalRecord = {
  itemId: string;
  icpCategory: IcpCategory;
  icpRole?: string;
  painSignalScore: number;
  aiSlopFrustrationScore: number;
  authorityScore: number;
  visibilityScore: number;
  championScore: number;
  priorityScore: number;
  rationale: string[];
  scoredAt: string;
};

export type TrendCluster = {
  phrase: string;
  itemCount: number;
  uniqueSourceCount: number;
  averagePriorityScore: number;
  firstSeenAt: string;
  latestSeenAt: string;
  trendScore: number;
  representativeItemIds: string[];
};

export type RejectedCandidate = {
  url: string;
  reason: FeedResolutionRejectionReason | string;
};

export type CanonicalFeedItem = {
  url: string;
  canonicalUrl: string;
  title: string;
  summary?: string;
  contentText?: string;
  author?: string;
  publishedAt?: Date;
  platform: OriginalPlatform;
  tags: string[];
  contentHash: string;
  externalId?: string;
};
