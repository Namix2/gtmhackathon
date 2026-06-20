"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { pollDueFeeds, pollFeedSource } from "@/lib/rss-engine/feeds/feed-poller";
import { resolveFeedUrl } from "@/lib/rss-engine/discovery/feed-url-resolver";
import {
  listFeedSources,
  registerFeedSource,
  searchFeedItems,
  searchSignals,
} from "@/lib/rss-engine/storage/repositories";
import {
  runDateWindowQuery,
  runPainSignalQuery,
  runSourceCategoryQuery,
  createDiscoverQueryRun,
  discoverSearchPhase,
  discoverRegisterPhase,
  discoverPollFeedsPhase,
  discoverMapCandidatesPhase,
} from "@/lib/rss-engine/services/query-runner";
import { ALL_PLATFORM_HINTS } from "@/lib/rss-engine/platforms";
import type { DiscoveryResultItem } from "@/lib/rss-engine/types";
import { computeTrendClusters } from "@/lib/rss-engine/scoring/trends";
import {
  dateWindowQuerySchema,
  painSignalQuerySchema,
  registerFeedRequestSchema,
  resolveFeedRequestSchema,
  sourceCategoryQuerySchema,
} from "@/lib/rss-engine/validation/schemas";
import type { OriginalPlatform } from "@/lib/rss-engine/types";

export type RssDashboardStats = {
  feedCount: number;
  itemCount: number;
  signalCount: number;
};

export type RssFeedRow = Awaited<ReturnType<typeof getRssFeeds>>[number];
export type RssSignalRow = Awaited<ReturnType<typeof getRssSignals>>[number];

export async function getRssStats(): Promise<RssDashboardStats> {
  const [feedCount, itemCount, signalCount] = await Promise.all([
    prisma.rssFeedSource.count({ where: { active: true } }),
    prisma.rssFeedItem.count(),
    prisma.rssScoredSignal.count(),
  ]);
  return { feedCount, itemCount, signalCount };
}

export async function getRssFeeds(filters?: {
  platform?: string;
  active?: boolean;
  dateCategory?: string;
}) {
  return listFeedSources({
    platform: filters?.platform,
    active: filters?.active,
    dateCategory: filters?.dateCategory,
  });
}

export async function getRssSignals(filters?: {
  icpCategory?: string;
  queryCategory?: string;
  minPriorityScore?: number;
  minPainScore?: number;
  minAiSlopScore?: number;
  limit?: number;
}) {
  return searchSignals({
    icpCategory: filters?.icpCategory,
    queryCategory: filters?.queryCategory,
    minPriorityScore: filters?.minPriorityScore,
    minPainScore: filters?.minPainScore,
    minAiSlopScore: filters?.minAiSlopScore,
    limit: filters?.limit ?? 50,
  });
}

export async function getRssItems(filters?: {
  q?: string;
  platform?: string;
  limit?: number;
}) {
  return searchFeedItems({
    q: filters?.q,
    platform: filters?.platform,
    limit: filters?.limit ?? 30,
  });
}

export async function getRssTrends(windowDays = 30) {
  const rows = await prisma.rssScoredSignal.findMany({
    where: { priorityScore: { gte: 0.5 } },
    include: { item: true },
    take: 300,
  });

  const phraseRows = rows.flatMap((row) => {
    const rationale = Array.isArray(row.rationale)
      ? (row.rationale as string[])
      : [];
    const phraseLine = rationale.find((r) => r.startsWith("matchedPhrases="));
    const phrases =
      phraseLine?.replace("matchedPhrases=", "").split(",").filter(Boolean) ??
      ["ai slop"];
    return phrases.map((phrase) => ({
      id: row.itemId,
      feedSourceId: row.item.feedSourceId,
      phrase: phrase.trim(),
      priorityScore: row.priorityScore,
      publishedAt: row.item.publishedAt,
    }));
  });

  return computeTrendClusters(phraseRows, windowDays)
    .filter((c) => c.uniqueSourceCount >= 2)
    .sort((a, b) => b.trendScore - a.trendScore)
    .slice(0, 10);
}

export async function registerRssFeed(input: {
  feedUrl: string;
  title?: string;
  originalPlatform?: OriginalPlatform;
  sourceType?: "native_rss" | "rsshub" | "rssbridge" | "rss_app" | "manual";
  dateCategory?: "recent" | "trending" | "evergreen";
  queryCategory?: string;
  pollingIntervalMinutes?: number;
}) {
  const body = registerFeedRequestSchema.parse({
    sourceType: input.sourceType ?? "native_rss",
    originalPlatform: input.originalPlatform ?? "unknown",
    feedUrl: input.feedUrl,
    title: input.title,
    dateCategory: input.dateCategory,
    queryCategory: input.queryCategory,
    pollingIntervalMinutes: input.pollingIntervalMinutes,
  });

  const { feed, created } = await registerFeedSource(body);
  revalidatePath("/rss");
  return { id: feed.id, created, feedUrl: feed.feedUrl };
}

export async function resolveAndRegisterRssFeed(input: {
  url: string;
  platformHint?: OriginalPlatform;
  title?: string;
  dateCategory?: "recent" | "trending" | "evergreen";
  queryCategory?: string;
}) {
  const parsed = resolveFeedRequestSchema.parse({
    url: input.url,
    platformHint: input.platformHint,
  });

  const resolution = await resolveFeedUrl(parsed);
  if (!resolution.selected) {
    throw new Error(
      resolution.rejections[0]?.reason ?? "Could not resolve feed URL"
    );
  }

  return registerRssFeed({
    feedUrl: resolution.selected.feedUrl,
    title: input.title,
    originalPlatform: input.platformHint ?? "unknown",
    sourceType: resolution.selected.sourceType,
    dateCategory: input.dateCategory,
    queryCategory: input.queryCategory,
  });
}

export async function pollRssFeedAction(feedSourceId: string) {
  const result = await pollFeedSource(feedSourceId);
  revalidatePath("/rss");
  return result;
}

export async function pollDueRssFeedsAction() {
  const results = await pollDueFeeds(20);
  revalidatePath("/rss");
  return { polled: results.length, results };
}

export async function runRssDateWindowQueryAction(input: {
  dateCategory: "recent" | "trending" | "evergreen";
  windowDays?: number;
  queries: string[];
  platformHints?: OriginalPlatform[];
  autoRegisterFeeds?: boolean;
  pollingIntervalMinutes?: number;
}) {
  const body = dateWindowQuerySchema.parse({
    ...input,
    maxSourcesPerQuery: 20,
  });
  const result = await runDateWindowQuery(body);
  revalidatePath("/rss");
  return result;
}

export async function runRssPainSignalQueryAction(input: {
  queries: string[];
  dateWindowDays?: number;
  autoRegisterFeeds?: boolean;
}) {
  const body = painSignalQuerySchema.parse(input);
  const result = await runPainSignalQuery(body);
  revalidatePath("/rss");
  return result;
}

export async function runRssSourceCategoryQueryAction(input: {
  sourceCategory: OriginalPlatform;
  queries: string[];
  autoRegisterFeeds?: boolean;
}) {
  const body = sourceCategoryQuerySchema.parse({
    ...input,
    maxSourcesPerQuery: 50,
  });
  const result = await runSourceCategoryQuery(body);
  revalidatePath("/rss");
  return result;
}

export async function previewRssFeedResolution(url: string) {
  const resolution = await resolveFeedUrl({ url });
  return resolution;
}

export type DiscoverPipelineConfig = {
  kind:
    | "recent"
    | "trending"
    | "evergreen"
    | "pain_signals"
    | "source_category";
  queries: string[];
  autoRegisterFeeds: boolean;
  sourceCategory?: OriginalPlatform;
};

export async function discoverPipelineSearchAction(
  config: DiscoverPipelineConfig
) {
  const queryRun = await createDiscoverQueryRun(config.kind, config);

  let searchParams: Parameters<typeof discoverSearchPhase>[0];

  if (config.kind === "pain_signals") {
    searchParams = {
      queries: config.queries,
      platformHints: ALL_PLATFORM_HINTS,
      dateWindowDays: 30,
      maxResultsPerProvider: 12,
      queryCategory: "pain_signals",
    };
  } else if (config.kind === "source_category") {
    searchParams = {
      queries: config.queries.map(
        (q) => `${config.sourceCategory ?? "substack"} ${q}`
      ),
      platformHints: ALL_PLATFORM_HINTS,
      dateWindowDays: 365,
      maxResultsPerProvider: 12,
      queryCategory: "source_discovery",
    };
  } else {
    const windowDays =
      config.kind === "recent" ? 7 : config.kind === "trending" ? 30 : 365;
    searchParams = {
      queries: config.queries,
      platformHints: ALL_PLATFORM_HINTS,
      dateWindowDays: windowDays,
      maxResultsPerProvider: 12,
      queryCategory: "source_discovery",
    };
  }

  const { results, resultCount } = await discoverSearchPhase(searchParams);
  return { queryRunId: queryRun.id, results, resultCount };
}

export async function discoverPipelineRegisterAction(input: {
  queryRunId: string;
  results: DiscoveryResultItem[];
  config: DiscoverPipelineConfig;
}) {
  const { config } = input;

  let queryCategory: string | undefined;
  let dateCategory: "recent" | "trending" | "evergreen" | undefined;
  let pollingIntervalMinutes: number | undefined;
  let maxSources: number | undefined;

  if (config.kind === "pain_signals") {
    queryCategory = "pain_signals";
    dateCategory = "recent";
    pollingIntervalMinutes = 60;
  } else if (config.kind === "source_category") {
    queryCategory = "source_discovery";
    dateCategory = "evergreen";
    pollingIntervalMinutes = 720;
    maxSources = 50 * config.queries.length;
  } else {
    queryCategory = "source_discovery";
    dateCategory = config.kind;
    pollingIntervalMinutes =
      config.kind === "recent" ? 60 : config.kind === "trending" ? 180 : 720;
    maxSources = 20 * config.queries.length;
  }

  return discoverRegisterPhase({
    results: input.results,
    queryRunId: input.queryRunId,
    queryCategory: queryCategory as "pain_signals" | "source_discovery",
    dateCategory,
    autoRegisterFeeds: true,
    pollingIntervalMinutes,
    maxSources,
  });
}

export async function discoverPipelinePollAllAction(
  feedSourceIds: string[],
  config: DiscoverPipelineConfig
) {
  let queryCategory: "pain_signals" | "source_discovery" | undefined;
  let dateCategory: "recent" | "trending" | "evergreen" | undefined;

  if (config.kind === "pain_signals") {
    queryCategory = "pain_signals";
    dateCategory = "recent";
  } else if (config.kind === "source_category") {
    queryCategory = "source_discovery";
    dateCategory = "evergreen";
  } else {
    queryCategory = "source_discovery";
    dateCategory = config.kind;
  }

  const results = await discoverPollFeedsPhase(feedSourceIds, {
    queryCategory,
    dateCategory,
  });
  revalidatePath("/rss");
  return results;
}

export async function discoverPipelineMapCandidatesAction(queryRunId: string) {
  const result = await discoverMapCandidatesPhase(queryRunId);
  revalidatePath("/rss");
  revalidatePath("/candidates");
  return result;
}

export async function discoverPipelinePollFeedAction(
  feedSourceId: string,
  config: DiscoverPipelineConfig
) {
  let queryCategory: "pain_signals" | "source_discovery" | undefined;
  let dateCategory: "recent" | "trending" | "evergreen" | undefined;

  if (config.kind === "pain_signals") {
    queryCategory = "pain_signals";
    dateCategory = "recent";
  } else if (config.kind === "source_category") {
    queryCategory = "source_discovery";
    dateCategory = "evergreen";
  } else {
    queryCategory = "source_discovery";
    dateCategory = config.kind;
  }

  const result = await discoverPollFeedPhase(feedSourceId, {
    queryCategory,
    dateCategory,
  });
  revalidatePath("/rss");
  return result;
}

export async function discoverPipelineFinishAction() {
  revalidatePath("/rss");
}
