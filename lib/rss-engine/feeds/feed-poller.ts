import { parseFeedUrl } from "./feed-parser";
import { normalizeFeedItem } from "../items/canonicalizer";
import { checkDuplicate } from "../items/deduper";
import { FAST_DISCOVER_MAX_ITEMS_PER_FEED } from "../platforms";
import { mapPool } from "../concurrency";
import { rssEngineConfig } from "../config";
import { rssLogger } from "../logger";
import {
  getFeedSourceById,
  scoreAndPersistItem,
  updateFeedPollState,
  upsertFeedItem,
} from "../storage/repositories";
import { prisma } from "@/lib/db";
import type { OriginalPlatform, QueryCategory } from "../types";

type DateCategory = "recent" | "trending" | "evergreen";

export type PollFeedResult = {
  feedSourceId: string;
  fetchedItems: number;
  newItems: number;
  duplicates: number;
  errors: string[];
};

export async function pollFeedSource(
  feedSourceId: string,
  options?: {
    queryCategory?: QueryCategory;
    dateCategory?: string;
    fastDiscover?: boolean;
    maxItems?: number;
  }
): Promise<PollFeedResult> {
  const feed = await getFeedSourceById(feedSourceId);
  if (!feed) {
    throw new Error(`Feed source not found: ${feedSourceId}`);
  }

  const errors: string[] = [];
  let fetchedItems = 0;
  let newItems = 0;
  let duplicates = 0;
  let highPriorityCount = 0;

  try {
    const maxItems =
      options?.maxItems ??
      (options?.fastDiscover ? FAST_DISCOVER_MAX_ITEMS_PER_FEED : undefined);
    const parsed = await parseFeedUrl(feed.feedUrl, maxItems);
    fetchedItems = parsed.items.length;

    const existing = await prisma.rssFeedItem.findMany({
      where: { feedSourceId },
      select: { canonicalUrl: true, contentHash: true },
    });
    const canonicalUrls = new Set(existing.map((e) => e.canonicalUrl));
    const contentHashes = new Set(existing.map((e) => e.contentHash));

    for (const raw of parsed.items) {
      const body =
        raw.contentSnippet ?? raw.content ?? raw.title ?? "";
      const canonical = normalizeFeedItem({
        url: raw.link,
        title: raw.title,
        summary: raw.contentSnippet,
        contentText: body,
        author: raw.creator ?? raw.author,
        publishedAt: raw.isoDate
          ? new Date(raw.isoDate)
          : raw.pubDate
            ? new Date(raw.pubDate)
            : undefined,
        platform: feed.originalPlatform as OriginalPlatform,
        tags: raw.categories ?? [],
        externalId: raw.guid ?? raw.link,
      });

      const dup = checkDuplicate(
        { canonicalUrls, contentHashes },
        canonical
      );
      if (dup.isDuplicate) {
        duplicates += 1;
        continue;
      }

      const saved = await upsertFeedItem(feedSourceId, {
        url: canonical.url,
        canonicalUrl: canonical.canonicalUrl,
        title: canonical.title,
        summary: canonical.summary,
        contentText: canonical.contentText,
        author: canonical.author,
        publishedAt: canonical.publishedAt,
        platform: canonical.platform,
        tags: canonical.tags,
        contentHash: canonical.contentHash,
        externalId: canonical.externalId,
      });

      canonicalUrls.add(canonical.canonicalUrl);
      contentHashes.add(canonical.contentHash);
      newItems += 1;

      const score = await scoreAndPersistItem(saved.id, {
        title: canonical.title,
        summary: canonical.summary,
        contentText: canonical.contentText,
        author: canonical.author,
        platform: canonical.platform,
        publishedAt: canonical.publishedAt,
        queryCategory:
          (options?.queryCategory as QueryCategory | undefined) ??
          (feed.queryCategory as QueryCategory | undefined),
      });

      if (score.priorityScore >= 0.65) highPriorityCount += 1;
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown poll error";
    errors.push(message);
    rssLogger.error("feed poll failed", { feedSourceId, message });
  }

  await updateFeedPollState(feedSourceId, {
    newItems,
    highPriorityCount,
    pollingIntervalMinutes: feed.pollingIntervalMinutes,
  });

  return {
    feedSourceId,
    fetchedItems,
    newItems,
    duplicates,
    errors,
  };
}

export async function pollFeedsParallel(
  feedSourceIds: string[],
  options?: {
    queryCategory?: QueryCategory;
    dateCategory?: DateCategory;
    fastDiscover?: boolean;
    concurrency?: number;
  }
): Promise<PollFeedResult[]> {
  const concurrency =
    options?.concurrency ?? rssEngineConfig().pollConcurrency;
  return mapPool(feedSourceIds, concurrency, (id) =>
    pollFeedSource(id, options)
  );
}

export async function pollDueFeeds(limit = 20): Promise<PollFeedResult[]> {
  const due = await prisma.rssFeedSource.findMany({
    where: {
      active: true,
      OR: [{ nextPollAt: null }, { nextPollAt: { lte: new Date() } }],
    },
    take: limit,
    orderBy: { nextPollAt: "asc" },
  });

  return pollFeedsParallel(
    due.map((f) => f.id),
    { concurrency: rssEngineConfig().pollConcurrency }
  );
}
