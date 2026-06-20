import type { FeedItem, FeedSource, ScoredSignal } from "../types";

// Repository interfaces — the persistence module boundary. The engine depends
// only on these interfaces, so the in-memory implementation (default) can be
// swapped for a Postgres-backed one (see storage/schema.sql) without touching
// any service code.

export type NewFeedSource = Omit<
  FeedSource,
  "id" | "createdAt" | "updatedAt" | "active"
> & { active?: boolean };

export type NewFeedItem = Omit<FeedItem, "id" | "discoveredAt"> & {
  discoveredAt?: string;
};

export interface ListFeedSourceFilter {
  platform?: string;
  active?: boolean;
  queryCategory?: string;
  dateCategory?: string;
}

export interface FeedSourceRepository {
  create(input: NewFeedSource): Promise<FeedSource>;
  upsertByFeedUrl(
    input: NewFeedSource
  ): Promise<{ feedSource: FeedSource; created: boolean }>;
  getById(id: string): Promise<FeedSource | null>;
  list(filter?: ListFeedSourceFilter): Promise<FeedSource[]>;
  update(id: string, patch: Partial<FeedSource>): Promise<FeedSource>;
}

export interface FeedItemFilter {
  q?: string;
  platform?: string;
  publishedAfter?: string;
  limit?: number;
}

export interface FeedItemRepository {
  insertIfNew(input: NewFeedItem): Promise<{ item: FeedItem; isNew: boolean }>;
  getById(id: string): Promise<FeedItem | null>;
  findExisting(
    canonicalUrl: string,
    contentHash: string
  ): Promise<FeedItem | null>;
  search(filter?: FeedItemFilter): Promise<FeedItem[]>;
  listSince(isoDate: string): Promise<FeedItem[]>;
  all(): Promise<FeedItem[]>;
}

export interface SignalFilter {
  icpCategory?: string;
  queryCategory?: string;
  minPainScore?: number;
  minAiSlopScore?: number;
  minPriorityScore?: number;
  limit?: number;
}

export interface ScoredSignalWithItem {
  signal: ScoredSignal;
  item: FeedItem;
}

export interface ScoredSignalRepository {
  upsert(signal: ScoredSignal): Promise<void>;
  getByItemId(itemId: string): Promise<ScoredSignal | null>;
  search(filter?: SignalFilter): Promise<ScoredSignalWithItem[]>;
}

export interface Repositories {
  feedSources: FeedSourceRepository;
  feedItems: FeedItemRepository;
  signals: ScoredSignalRepository;
}
