export type SourceKey = "reddit" | "x" | "linkedin" | "rss";

export interface RawCandidateInput {
  externalId?: string;
  platformHandle?: string;
  profileUrl?: string;
  matchContext?: string;
  rawPayload?: Record<string, unknown>;
}

export interface ContentMetricsInput {
  likes?: number;
  comments?: number;
  shares?: number;
  views?: number;
  score?: number; // platform-native, e.g. Reddit upvotes
  extra?: Record<string, unknown>;
}

export interface ContentItemInput {
  externalId: string;
  type?: "post" | "tweet" | "comment" | "article" | "thread";
  url?: string;
  title?: string;
  body: string;
  authorHandle?: string;
  lang?: string;
  publishedAt?: string | Date;
  rawPayload?: Record<string, unknown>;
  // Links this content back to the candidate it belongs to (by candidate
  // externalId) so orchestration can associate rows during ingestion.
  candidateExternalId?: string;
  metrics?: ContentMetricsInput;
}

export interface ProfileInput {
  handle: string;
  externalId?: string;
  followers?: number;
  following?: number;
  posts?: number;
  audienceQuality?: Record<string, unknown>;
}

export interface NetRunContext {
  id: string;
  params: Record<string, unknown>;
  // Resolved per-source config (e.g. subreddits, handles, industries).
  sourceConfig: Record<string, unknown>;
}

export interface DiscoveryResult {
  candidates: RawCandidateInput[];
  content: ContentItemInput[];
  profiles: ProfileInput[];
}

export interface DiscoveryAgent {
  sourceKey: SourceKey;
  // Discover candidates plus their content + engagement + profile data.
  run(net: NetRunContext): Promise<DiscoveryResult>;
  // Refresh content for a single handle (backfill / re-pull), independent of discovery.
  fetchContent(handle: string): Promise<ContentItemInput[]>;
  // Refresh engagement metrics for a single piece of content.
  fetchMetrics(externalId: string): Promise<ContentMetricsInput | null>;
}
