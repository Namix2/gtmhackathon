import type { Logger } from "../logger";
import type { DateCategory, FeedItem, FeedSource } from "../types";
import type { Repositories } from "../storage/repositories";
import { canonicalizeItem } from "../items/canonicalizer";
import { dedupeFeedItems } from "../items/deduper";
import { scoreItem } from "../scoring/score-item";
import type { FeedFetcher } from "./feed-fetcher";
import { parseFeedXml } from "./feed-parser";
import {
  computeNextPollAt,
  nextPollIntervalMinutes,
  type PollingStats,
} from "./polling-policy";

// Feed poller — the single canonical ingestion step: fetch one feed, parse,
// canonicalise, dedupe, persist new items, and score them. Deterministic given a
// fixed clock.

export interface PollResult {
  feedSourceId: string;
  fetchedItems: number;
  newItems: number;
  duplicates: number;
  errors: string[];
  nextPollAt: string;
}

const WINDOW_BY_CATEGORY: Record<DateCategory, number> = {
  recent: 7,
  trending: 30,
  evergreen: 365,
};

export interface PollerDeps {
  repos: Repositories;
  feedFetcher: FeedFetcher;
  logger: Logger;
  now?: () => Date;
}

export function createFeedPoller(deps: PollerDeps) {
  const { repos, feedFetcher, logger } = deps;
  const now = deps.now ?? (() => new Date());

  async function pollFeed(source: FeedSource): Promise<PollResult> {
    const errors: string[] = [];
    const at = now();
    const windowDays =
      WINDOW_BY_CATEGORY[(source.dateCategory ?? "trending") as DateCategory] ?? 30;

    let fetchedItems = 0;
    let newItems = 0;
    let duplicates = 0;
    let latestItemAt: string | undefined = source.lastItemAt;

    try {
      const xml = await feedFetcher.fetchFeedXml(source.feedUrl);
      const feed = await parseFeedXml(xml);
      fetchedItems = feed.items.length;

      const canonical = feed.items
        .map((raw) => canonicalizeItem(raw, source))
        .filter((item): item is NonNullable<typeof item> => item !== null);
      const deduped = dedupeFeedItems(canonical);

      for (const candidate of deduped) {
        const { item, isNew } = await repos.feedItems.insertIfNew(candidate);
        if (!isNew) {
          duplicates++;
          continue;
        }
        newItems++;
        if (item.publishedAt && (!latestItemAt || item.publishedAt > latestItemAt)) {
          latestItemAt = item.publishedAt;
        }
        await scoreAndStore(item, source, at, windowDays);
      }
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      errors.push(detail);
      logger.warn("feed poll failed", { feedUrl: source.feedUrl, error: detail });
    }

    const stats = await computeStats(repos, source, at);
    const intervalMinutes = nextPollIntervalMinutes(
      { ...source, lastItemAt: latestItemAt },
      stats
    );
    const nextPollAt = computeNextPollAt(at, intervalMinutes);

    await repos.feedSources.update(source.id, {
      lastPolledAt: at.toISOString(),
      lastItemAt: latestItemAt,
      pollingIntervalMinutes: intervalMinutes,
    });

    return {
      feedSourceId: source.id,
      fetchedItems,
      newItems,
      duplicates,
      errors,
      nextPollAt,
    };
  }

  async function scoreAndStore(
    item: FeedItem,
    source: FeedSource,
    at: Date,
    windowDays: number
  ): Promise<void> {
    const signal = scoreItem(item, {
      source,
      now: at,
      windowDays,
      queryCategory: source.queryCategory,
    });
    await repos.signals.upsert(signal);
  }

  return { pollFeed };
}

async function computeStats(
  repos: Repositories,
  source: FeedSource,
  now: Date
): Promise<PollingStats> {
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 3_600_000).toISOString();
  const recentSignals = await repos.signals.search({
    queryCategory: source.queryCategory,
    minPriorityScore: 0.65,
    limit: 500,
  });
  const highScoringCount7d = recentSignals.filter(
    (s) =>
      s.item.feedSourceId === source.id &&
      (s.item.publishedAt ?? s.item.discoveredAt) >= sevenDaysAgo
  ).length;

  const fortyEightHoursAgo = new Date(
    now.getTime() - 48 * 3_600_000
  ).toISOString();
  const hasHighPriority48h = recentSignals.some(
    (s) =>
      s.item.feedSourceId === source.id &&
      (s.item.publishedAt ?? s.item.discoveredAt) >= fortyEightHoursAgo
  );

  const lastItem = source.lastItemAt;
  const daysSinceLastRelevantItem = lastItem
    ? Math.floor((now.getTime() - new Date(lastItem).getTime()) / (24 * 3_600_000))
    : 999;

  return { highScoringCount7d, hasHighPriority48h, daysSinceLastRelevantItem };
}

export type FeedPoller = ReturnType<typeof createFeedPoller>;
