import { randomUUID } from "node:crypto";
import type { FeedItem, FeedSource, ScoredSignal } from "../types";
import type {
  FeedItemFilter,
  FeedItemRepository,
  FeedSourceRepository,
  ListFeedSourceFilter,
  NewFeedItem,
  NewFeedSource,
  Repositories,
  ScoredSignalRepository,
  ScoredSignalWithItem,
  SignalFilter,
} from "./repositories";

// In-memory repositories. The default persistence backend: zero infra, fully
// deterministic, ideal for local runs and tests. State lives for the process
// lifetime (a single Node server) and can be reset between tests.

type Clock = () => Date;

class InMemoryFeedSourceRepository implements FeedSourceRepository {
  private byId = new Map<string, FeedSource>();
  private idByFeedUrl = new Map<string, string>();

  constructor(private now: Clock) {}

  async create(input: NewFeedSource): Promise<FeedSource> {
    const ts = this.now().toISOString();
    const feedSource: FeedSource = {
      id: randomUUID(),
      active: input.active ?? true,
      createdAt: ts,
      updatedAt: ts,
      ...input,
    };
    this.byId.set(feedSource.id, feedSource);
    this.idByFeedUrl.set(feedSource.feedUrl, feedSource.id);
    return feedSource;
  }

  async upsertByFeedUrl(
    input: NewFeedSource
  ): Promise<{ feedSource: FeedSource; created: boolean }> {
    const existingId = this.idByFeedUrl.get(input.feedUrl);
    if (existingId) {
      const existing = this.byId.get(existingId)!;
      return { feedSource: existing, created: false };
    }
    const feedSource = await this.create(input);
    return { feedSource, created: true };
  }

  async getById(id: string): Promise<FeedSource | null> {
    return this.byId.get(id) ?? null;
  }

  async list(filter: ListFeedSourceFilter = {}): Promise<FeedSource[]> {
    return [...this.byId.values()]
      .filter((f) => (filter.platform ? f.originalPlatform === filter.platform : true))
      .filter((f) => (filter.active === undefined ? true : f.active === filter.active))
      .filter((f) =>
        filter.queryCategory ? f.queryCategory === filter.queryCategory : true
      )
      .filter((f) =>
        filter.dateCategory ? f.dateCategory === filter.dateCategory : true
      )
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async update(id: string, patch: Partial<FeedSource>): Promise<FeedSource> {
    const existing = this.byId.get(id);
    if (!existing) throw new Error(`FeedSource ${id} not found`);
    const updated: FeedSource = {
      ...existing,
      ...patch,
      id: existing.id,
      updatedAt: this.now().toISOString(),
    };
    this.byId.set(id, updated);
    return updated;
  }
}

class InMemoryFeedItemRepository implements FeedItemRepository {
  private byId = new Map<string, FeedItem>();
  private byCanonical = new Map<string, string>();
  private byHash = new Map<string, string>();

  constructor(private now: Clock) {}

  async insertIfNew(
    input: NewFeedItem
  ): Promise<{ item: FeedItem; isNew: boolean }> {
    const existing =
      this.byCanonical.get(input.canonicalUrl) ?? this.byHash.get(input.contentHash);
    if (existing) {
      return { item: this.byId.get(existing)!, isNew: false };
    }
    const item: FeedItem = {
      id: randomUUID(),
      discoveredAt: input.discoveredAt ?? this.now().toISOString(),
      ...input,
    };
    this.byId.set(item.id, item);
    this.byCanonical.set(item.canonicalUrl, item.id);
    this.byHash.set(item.contentHash, item.id);
    return { item, isNew: true };
  }

  async getById(id: string): Promise<FeedItem | null> {
    return this.byId.get(id) ?? null;
  }

  async findExisting(
    canonicalUrl: string,
    contentHash: string
  ): Promise<FeedItem | null> {
    const id = this.byCanonical.get(canonicalUrl) ?? this.byHash.get(contentHash);
    return id ? this.byId.get(id) ?? null : null;
  }

  async search(filter: FeedItemFilter = {}): Promise<FeedItem[]> {
    const q = filter.q?.toLowerCase();
    const after = filter.publishedAfter
      ? new Date(filter.publishedAfter).getTime()
      : undefined;
    return [...this.byId.values()]
      .filter((it) =>
        q
          ? `${it.title} ${it.summary ?? ""} ${it.contentText ?? ""}`
              .toLowerCase()
              .includes(q)
          : true
      )
      .filter((it) => (filter.platform ? it.platform === filter.platform : true))
      .filter((it) => {
        if (after === undefined) return true;
        if (!it.publishedAt) return false;
        return new Date(it.publishedAt).getTime() >= after;
      })
      .sort((a, b) => sortByPublished(b) - sortByPublished(a))
      .slice(0, filter.limit ?? 50);
  }

  async listSince(isoDate: string): Promise<FeedItem[]> {
    const cutoff = new Date(isoDate).getTime();
    return [...this.byId.values()].filter((it) => {
      const ts = it.publishedAt ?? it.discoveredAt;
      return new Date(ts).getTime() >= cutoff;
    });
  }

  async all(): Promise<FeedItem[]> {
    return [...this.byId.values()];
  }
}

function sortByPublished(item: FeedItem): number {
  return new Date(item.publishedAt ?? item.discoveredAt).getTime();
}

class InMemoryScoredSignalRepository implements ScoredSignalRepository {
  private byItemId = new Map<string, ScoredSignal>();

  constructor(private items: InMemoryFeedItemRepository) {}

  async upsert(signal: ScoredSignal): Promise<void> {
    this.byItemId.set(signal.itemId, signal);
  }

  async getByItemId(itemId: string): Promise<ScoredSignal | null> {
    return this.byItemId.get(itemId) ?? null;
  }

  async search(filter: SignalFilter = {}): Promise<ScoredSignalWithItem[]> {
    const out: ScoredSignalWithItem[] = [];
    for (const signal of this.byItemId.values()) {
      if (filter.icpCategory && signal.icpCategory !== filter.icpCategory) continue;
      if (filter.queryCategory && signal.queryCategory !== filter.queryCategory)
        continue;
      if (filter.minPainScore !== undefined && signal.painSignalScore < filter.minPainScore)
        continue;
      if (
        filter.minAiSlopScore !== undefined &&
        signal.aiSlopFrustrationScore < filter.minAiSlopScore
      )
        continue;
      if (
        filter.minPriorityScore !== undefined &&
        signal.priorityScore < filter.minPriorityScore
      )
        continue;
      const item = await this.items.getById(signal.itemId);
      if (!item) continue;
      out.push({ signal, item });
    }
    out.sort((a, b) => b.signal.priorityScore - a.signal.priorityScore);
    return out.slice(0, filter.limit ?? 50);
  }
}

export function createInMemoryRepositories(now: Clock = () => new Date()): Repositories {
  const feedItems = new InMemoryFeedItemRepository(now);
  return {
    feedSources: new InMemoryFeedSourceRepository(now),
    feedItems,
    signals: new InMemoryScoredSignalRepository(feedItems),
  };
}
