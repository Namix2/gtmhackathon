import { prisma } from "@/lib/db";
import type { RegisterFeedRequest } from "../validation/schemas";
import { rssEngineConfig } from "../config";
import { scoreFeedItem, sourceQualityScore } from "../scoring/priority-matrix";

export async function createQueryRun(input: {
  kind: string;
  params: Record<string, unknown>;
  registeredFeeds?: number;
  candidateFeeds?: number;
  rejectedCandidates?: { url: string; reason: string }[];
}) {
  return prisma.rssQueryRun.create({
    data: {
      kind: input.kind,
      params: input.params,
      registeredFeeds: input.registeredFeeds ?? 0,
      candidateFeeds: input.candidateFeeds ?? 0,
      rejectedCandidates: input.rejectedCandidates ?? [],
    },
  });
}

export async function registerFeedSource(
  input: RegisterFeedRequest & { queryRunId?: string }
) {
  const interval =
    input.pollingIntervalMinutes ??
    rssEngineConfig().defaultPollIntervalMinutes;

  const existing = await prisma.rssFeedSource.findUnique({
    where: { feedUrl: input.feedUrl },
  });

  if (existing) {
    const updated = await prisma.rssFeedSource.update({
      where: { id: existing.id },
      data: {
        active: true,
        title: input.title ?? existing.title,
        queryCategory: input.queryCategory ?? existing.queryCategory,
        dateCategory: input.dateCategory ?? existing.dateCategory,
        pollingIntervalMinutes: interval,
        queryRunId: input.queryRunId ?? existing.queryRunId,
      },
    });
    return { feed: updated, created: false };
  }

  const created = await prisma.rssFeedSource.create({
    data: {
      sourceType: input.sourceType,
      originalPlatform: input.originalPlatform,
      feedUrl: input.feedUrl,
      homepageUrl: input.homepageUrl,
      title: input.title,
      queryCategory: input.queryCategory,
      dateCategory: input.dateCategory,
      pollingIntervalMinutes: interval,
      queryRunId: input.queryRunId,
      nextPollAt: new Date(),
    },
  });

  return { feed: created, created: true };
}

export async function listFeedSources(filters: {
  platform?: string;
  active?: boolean;
  queryCategory?: string;
  dateCategory?: string;
}) {
  return prisma.rssFeedSource.findMany({
    where: {
      ...(filters.platform
        ? { originalPlatform: filters.platform }
        : undefined),
      ...(filters.active !== undefined ? { active: filters.active } : undefined),
      ...(filters.queryCategory
        ? { queryCategory: filters.queryCategory }
        : undefined),
      ...(filters.dateCategory
        ? { dateCategory: filters.dateCategory }
        : undefined),
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getFeedSourceById(id: string) {
  return prisma.rssFeedSource.findUnique({ where: { id } });
}

export async function upsertFeedItem(
  feedSourceId: string,
  item: {
    url: string;
    canonicalUrl: string;
    title: string;
    summary?: string;
    contentText?: string;
    author?: string;
    publishedAt?: Date;
    platform: string;
    tags: string[];
    contentHash: string;
    externalId?: string;
  }
) {
  return prisma.rssFeedItem.upsert({
    where: { canonicalUrl: item.canonicalUrl },
    create: {
      feedSourceId,
      ...item,
      tags: item.tags,
    },
    update: {
      title: item.title,
      summary: item.summary,
      contentText: item.contentText,
      author: item.author,
      publishedAt: item.publishedAt,
      tags: item.tags,
    },
  });
}

export async function upsertScoredSignal(
  itemId: string,
  score: {
    icpCategory: string;
    icpRole?: string;
    painSignalScore: number;
    aiSlopFrustrationScore: number;
    authorityScore: number;
    visibilityScore: number;
    championScore: number;
    priorityScore: number;
    rationale: string[];
  }
) {
  return prisma.rssScoredSignal.upsert({
    where: { itemId },
    create: {
      itemId,
      icpCategory: score.icpCategory,
      icpRole: score.icpRole,
      painSignalScore: score.painSignalScore,
      aiSlopFrustrationScore: score.aiSlopFrustrationScore,
      authorityScore: score.authorityScore,
      visibilityScore: score.visibilityScore,
      championScore: score.championScore,
      priorityScore: score.priorityScore,
      rationale: score.rationale,
    },
    update: {
      icpCategory: score.icpCategory,
      icpRole: score.icpRole,
      painSignalScore: score.painSignalScore,
      aiSlopFrustrationScore: score.aiSlopFrustrationScore,
      authorityScore: score.authorityScore,
      visibilityScore: score.visibilityScore,
      championScore: score.championScore,
      priorityScore: score.priorityScore,
      rationale: score.rationale,
    },
  });
}

export async function searchFeedItems(filters: {
  q?: string;
  platform?: string;
  publishedAfter?: Date;
  limit?: number;
}) {
  const limit = filters.limit ?? 50;
  const items = await prisma.rssFeedItem.findMany({
    where: {
      ...(filters.platform ? { platform: filters.platform } : undefined),
      ...(filters.publishedAfter
        ? { publishedAt: { gte: filters.publishedAfter } }
        : undefined),
    },
    include: { signal: true, feedSource: true },
    orderBy: { discoveredAt: "desc" },
    take: limit * 3,
  });

  if (!filters.q) return items.slice(0, limit);

  const q = filters.q.toLowerCase();
  return items
    .filter(
      (item) =>
        item.title.toLowerCase().includes(q) ||
        (item.contentText ?? "").toLowerCase().includes(q) ||
        (item.summary ?? "").toLowerCase().includes(q)
    )
    .slice(0, limit);
}

export async function searchSignals(filters: {
  queryCategory?: string;
  icpCategory?: string;
  minPainScore?: number;
  minAiSlopScore?: number;
  minPriorityScore?: number;
  limit?: number;
}) {
  const limit = filters.limit ?? 50;

  const signals = await prisma.rssScoredSignal.findMany({
    where: {
      ...(filters.icpCategory
        ? { icpCategory: filters.icpCategory }
        : undefined),
      ...(filters.minPainScore !== undefined
        ? { painSignalScore: { gte: filters.minPainScore } }
        : undefined),
      ...(filters.minAiSlopScore !== undefined
        ? { aiSlopFrustrationScore: { gte: filters.minAiSlopScore } }
        : undefined),
      ...(filters.minPriorityScore !== undefined
        ? { priorityScore: { gte: filters.minPriorityScore } }
        : undefined),
    },
    include: {
      item: { include: { feedSource: true } },
    },
    orderBy: { priorityScore: "desc" },
    take: limit * 2,
  });

  if (!filters.queryCategory) return signals.slice(0, limit);

  return signals
    .filter(
      (s) => s.item.feedSource.queryCategory === filters.queryCategory
    )
    .slice(0, limit);
}

export async function updateFeedPollState(
  feedSourceId: string,
  input: {
    newItems: number;
    highPriorityCount?: number;
    pollingIntervalMinutes?: number;
  }
) {
  const feed = await prisma.rssFeedSource.findUnique({
    where: { id: feedSourceId },
  });
  if (!feed) return;

  let interval = input.pollingIntervalMinutes ?? feed.pollingIntervalMinutes;
  let consecutiveEmptyPolls = feed.consecutiveEmptyPolls;
  let highScoreItemCount7d = feed.highScoreItemCount7d;

  if (input.newItems === 0) {
    consecutiveEmptyPolls += 1;
    if (consecutiveEmptyPolls >= 14 && interval < 360) interval = 360;
  } else {
    consecutiveEmptyPolls = 0;
  }

  if ((input.highPriorityCount ?? 0) >= 3 && interval > 30) {
    interval = 30;
    highScoreItemCount7d += input.highPriorityCount ?? 0;
  }

  const nextPollAt = new Date(Date.now() + interval * 60 * 1000);

  await prisma.rssFeedSource.update({
    where: { id: feedSourceId },
    data: {
      pollingIntervalMinutes: interval,
      consecutiveEmptyPolls,
      highScoreItemCount7d,
      lastPolledAt: new Date(),
      nextPollAt,
    },
  });

  return nextPollAt;
}

export async function scoreAndPersistItem(
  itemId: string,
  input: Parameters<typeof scoreFeedItem>[0]
) {
  const score = scoreFeedItem(input);
  await upsertScoredSignal(itemId, score);
  return score;
}

export async function promoteToEvergreen(feedSourceId: string) {
  const feed = await prisma.rssFeedSource.findUnique({
    where: { id: feedSourceId },
    include: { items: { include: { signal: true }, take: 20 } },
  });
  if (!feed) throw new Error("Feed source not found");

  const topicalMatches = feed.items.filter(
    (i) => (i.signal?.priorityScore ?? 0) >= 0.5
  ).length;
  const authorityScore =
    feed.items.reduce((acc, i) => acc + (i.signal?.authorityScore ?? 0), 0) /
    Math.max(1, feed.items.length);

  const quality = sourceQualityScore({
    postsInWindow: feed.items.length,
    topicalMatches,
    authorityScore,
    feedReliability: feed.consecutiveEmptyPolls === 0 ? 1 : 0.6,
  });

  return prisma.rssFeedSource.update({
    where: { id: feedSourceId },
    data: {
      dateCategory: "evergreen",
      pollingIntervalMinutes: 720,
      sourceQualityScore: quality.score,
      sourceQualityRationale: quality.rationale,
      active: true,
    },
  });
}
