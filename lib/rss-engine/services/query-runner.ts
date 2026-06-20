import { getDiscoveryClients, availableDiscoveryProviders } from "../discovery";
import { resolveFeedUrl } from "../discovery/feed-url-resolver";
import {
  ALL_PLATFORM_HINTS,
  buildDiscoveryQuery,
} from "../discovery/search-query-builder";
import { pollFeedSource, pollFeedsParallel } from "../feeds/feed-poller";
import { mapRssDiscoveryToCandidates } from "../map-candidates";
import { mapPool } from "../concurrency";
import { rssEngineConfig } from "../config";
import {
  createQueryRun,
  registerFeedSource,
} from "../storage/repositories";
import { prisma } from "@/lib/db";
import type {
  DateCategory,
  DiscoveryResultItem,
  QueryCategory,
  RejectedCandidate,
} from "../types";
import type {
  DateWindowQueryRequest,
  DiscoverySearchRequest,
  PainSignalQueryRequest,
  SourceCategoryQueryRequest,
} from "../validation/schemas";
import {
  defaultDateWindowForCategory,
  defaultPollingForDateCategory,
} from "../discovery/search-query-builder";

export { ALL_PLATFORM_HINTS };

export async function runDiscoverySearch(
  input: DiscoverySearchRequest & { fast?: boolean }
): Promise<{ results: DiscoveryResultItem[] }> {
  const configured = availableDiscoveryProviders();
  const providers = input.providers.filter((p) => configured.includes(p));
  if (providers.length === 0) {
    throw new Error(
      "No discovery providers available. Set EXA_API_KEY and/or TAVILY_API_KEY, or enable RSS_ENGINE_MOCK_PROVIDERS for local mocks."
    );
  }

  const { discoveryConcurrency, discoveryMaxResults } = rssEngineConfig();
  const clients = getDiscoveryClients(providers);
  const platformHints =
    input.platformHints.length > 0 ? input.platformHints : ALL_PLATFORM_HINTS;
  const maxResults = input.maxResultsPerProvider ?? discoveryMaxResults;
  const fast = input.fast ?? true;

  type SearchJob = { query: string; client: (typeof clients)[number] };
  const jobs: SearchJob[] = [];
  for (const query of input.queries) {
    const built = buildDiscoveryQuery(query, platformHints);
    for (const client of clients) {
      jobs.push({ query: built, client });
    }
  }

  const searchBatches = await mapPool(
    jobs,
    discoveryConcurrency,
    async ({ query, client }) =>
      client.search({
        query,
        dateWindowDays: input.dateWindowDays,
        maxResults,
        platformHints,
      })
  );

  const rowByUrl = new Map<string, DiscoveryResultItem>();
  for (const batch of searchBatches) {
    for (const row of batch) {
      if (!rowByUrl.has(row.url)) rowByUrl.set(row.url, row);
    }
  }

  const uniqueRows = Array.from(rowByUrl.values());

  const enriched = await mapPool(
    uniqueRows,
    discoveryConcurrency,
    async (row) => {
      const resolution = await resolveFeedUrl({
        url: row.url,
        platformHint: row.platformHint,
        fast,
      });
      return {
        ...row,
        feedCandidates: resolution.candidates,
        selected: resolution.selected,
      } as DiscoveryResultItem & { selected?: { feedUrl: string } };
    }
  );

  return { results: enriched };
}

async function registerFromDiscoveryResults(input: {
  results: DiscoveryResultItem[];
  queryCategory?: QueryCategory;
  dateCategory?: DateCategory;
  autoRegisterFeeds: boolean;
  pollingIntervalMinutes?: number;
  queryRunId?: string;
  maxSources?: number;
}): Promise<{
  registeredFeeds: number;
  candidateFeeds: number;
  rejectedCandidates: RejectedCandidate[];
  feedsToPoll: { id: string; title: string | null; feedUrl: string }[];
}> {
  const rejectedCandidates: RejectedCandidate[] = [];
  let registeredFeeds = 0;
  let candidateFeeds = 0;
  const seen = new Set<string>();
  const feedsToPoll: { id: string; title: string | null; feedUrl: string }[] =
    [];

  for (const result of input.results) {
    if (input.maxSources && candidateFeeds >= input.maxSources) break;

    const selected = result.feedCandidates[0];
    if (!selected) {
      rejectedCandidates.push({
        url: result.url,
        reason: "no_feed_found",
      });
      continue;
    }

    candidateFeeds += 1;
    if (seen.has(selected.feedUrl)) continue;
    seen.add(selected.feedUrl);

    if (!input.autoRegisterFeeds) continue;

    const { feed, created } = await registerFeedSource({
      sourceType: selected.sourceType,
      originalPlatform: result.platformHint,
      feedUrl: selected.feedUrl,
      homepageUrl: result.url,
      title: result.title,
      queryCategory: input.queryCategory,
      dateCategory: input.dateCategory,
      pollingIntervalMinutes: input.pollingIntervalMinutes,
      queryRunId: input.queryRunId,
    });

    if (created) registeredFeeds += 1;
    feedsToPoll.push({
      id: feed.id,
      title: feed.title ?? result.title ?? null,
      feedUrl: feed.feedUrl,
    });
  }

  return {
    registeredFeeds,
    candidateFeeds,
    rejectedCandidates,
    feedsToPoll,
  };
}

export type DiscoverSearchParams = {
  queries: string[];
  platformHints?: DiscoverySearchRequest["platformHints"];
  dateWindowDays?: number;
  maxResultsPerProvider?: number;
  queryCategory?: QueryCategory;
};

export async function discoverSearchPhase(
  input: DiscoverSearchParams
): Promise<{ results: DiscoveryResultItem[]; resultCount: number }> {
  const { discoveryMaxResults } = rssEngineConfig();
  const { results } = await runDiscoverySearch({
    queryCategory: input.queryCategory ?? "source_discovery",
    queries: input.queries,
    providers: ["exa", "tavily"],
    platformHints: input.platformHints ?? ALL_PLATFORM_HINTS,
    dateWindowDays: input.dateWindowDays ?? 30,
    maxResultsPerProvider: input.maxResultsPerProvider ?? discoveryMaxResults,
    fast: true,
  });
  return { results, resultCount: results.length };
}

export async function discoverRegisterPhase(input: {
  results: DiscoveryResultItem[];
  queryRunId: string;
  queryCategory?: QueryCategory;
  dateCategory?: DateCategory;
  autoRegisterFeeds?: boolean;
  pollingIntervalMinutes?: number;
  maxSources?: number;
}): Promise<{
  registeredFeeds: number;
  candidateFeeds: number;
  rejectedCandidates: RejectedCandidate[];
  feedsToPoll: { id: string; title: string | null; feedUrl: string }[];
}> {
  const registration = await registerFromDiscoveryResults({
    ...input,
    autoRegisterFeeds: input.autoRegisterFeeds ?? true,
  });

  await prisma.rssQueryRun.update({
    where: { id: input.queryRunId },
    data: {
      registeredFeeds: registration.registeredFeeds,
      candidateFeeds: registration.candidateFeeds,
      rejectedCandidates: registration.rejectedCandidates,
    },
  });

  return registration;
}

export async function discoverPollFeedsPhase(
  feedIds: string[],
  options?: { queryCategory?: QueryCategory; dateCategory?: DateCategory }
) {
  const { pollConcurrency } = rssEngineConfig();
  return pollFeedsParallel(feedIds, {
    ...options,
    fastDiscover: true,
    concurrency: pollConcurrency,
  });
}

export async function discoverMapCandidatesPhase(queryRunId: string) {
  return mapRssDiscoveryToCandidates({ queryRunId });
}

export async function discoverPollFeedPhase(
  feedSourceId: string,
  options?: { queryCategory?: QueryCategory; dateCategory?: DateCategory }
) {
  return pollFeedSource(feedSourceId, { ...options, fastDiscover: true });
}

export async function createDiscoverQueryRun(
  kind: string,
  params: Record<string, unknown>
) {
  return createQueryRun({ kind, params });
}

export async function runDateWindowQuery(input: DateWindowQueryRequest) {
  const windowDays =
    input.windowDays ?? defaultDateWindowForCategory(input.dateCategory);
  const pollingIntervalMinutes =
    input.pollingIntervalMinutes ??
    defaultPollingForDateCategory(input.dateCategory);

  const queryRun = await createQueryRun({
    kind: "date-window",
    params: input as unknown as Record<string, unknown>,
  });

  const { results } = await runDiscoverySearch({
    queryCategory: "source_discovery",
    queries: input.queries,
    providers: ["exa", "tavily"],
    platformHints:
      input.platformHints.length > 0
        ? input.platformHints
        : ALL_PLATFORM_HINTS,
    dateWindowDays: windowDays,
    maxResultsPerProvider: input.maxSourcesPerQuery,
    fast: true,
  });

  const registration = await registerFromDiscoveryResults({
    results,
    queryCategory: "source_discovery",
    dateCategory: input.dateCategory,
    autoRegisterFeeds: input.autoRegisterFeeds ?? true,
    pollingIntervalMinutes,
    queryRunId: queryRun.id,
    maxSources: input.maxSourcesPerQuery * input.queries.length,
  });

  await discoverPollFeedsPhase(
    registration.feedsToPoll.map((f) => f.id),
    { queryCategory: "source_discovery", dateCategory: input.dateCategory }
  );

  await mapRssDiscoveryToCandidates({ queryRunId: queryRun.id });

  await prisma.rssQueryRun.update({
    where: { id: queryRun.id },
    data: {
      registeredFeeds: registration.registeredFeeds,
      candidateFeeds: registration.candidateFeeds,
      rejectedCandidates: registration.rejectedCandidates,
    },
  });

  return {
    dateCategory: input.dateCategory,
    registeredFeeds: registration.registeredFeeds,
    candidateFeeds: registration.candidateFeeds,
    rejectedCandidates: registration.rejectedCandidates,
    nextPollAt: new Date(
      Date.now() + pollingIntervalMinutes * 60 * 1000
    ).toISOString(),
    queryRunId: queryRun.id,
  };
}

export async function runSourceCategoryQuery(
  input: SourceCategoryQueryRequest
) {
  const queryRun = await createQueryRun({
    kind: "source-category",
    params: input as unknown as Record<string, unknown>,
  });

  const { results } = await runDiscoverySearch({
    queryCategory: "source_discovery",
    queries: input.queries.map((q) => `${input.sourceCategory} ${q}`),
    providers: ["exa", "tavily"],
    platformHints: [input.sourceCategory],
    dateWindowDays: 365,
    maxResultsPerProvider: input.maxSourcesPerQuery,
    fast: true,
  });

  const registration = await registerFromDiscoveryResults({
    results,
    queryCategory: "source_discovery",
    dateCategory: "evergreen",
    autoRegisterFeeds: input.autoRegisterFeeds ?? true,
    pollingIntervalMinutes: input.pollingIntervalMinutes ?? 720,
    queryRunId: queryRun.id,
    maxSources: input.maxSourcesPerQuery * input.queries.length,
  });

  await discoverPollFeedsPhase(registration.feedsToPoll.map((f) => f.id), {
    queryCategory: "source_discovery",
    dateCategory: "evergreen",
  });
  await mapRssDiscoveryToCandidates({ queryRunId: queryRun.id });

  return {
    sourceCategory: input.sourceCategory,
    registeredFeeds: registration.registeredFeeds,
    candidateFeeds: registration.candidateFeeds,
    rejectedCandidates: registration.rejectedCandidates,
    queryRunId: queryRun.id,
  };
}

export async function runPainSignalQuery(input: PainSignalQueryRequest) {
  const queryRun = await createQueryRun({
    kind: "pain-signal",
    params: input as unknown as Record<string, unknown>,
  });

  const { results } = await runDiscoverySearch({
    queryCategory: "pain_signals",
    queries: input.queries,
    providers: ["exa", "tavily"],
    platformHints: ALL_PLATFORM_HINTS,
    dateWindowDays: input.dateWindowDays,
    maxResultsPerProvider: 25,
    fast: true,
  });

  const registration = await registerFromDiscoveryResults({
    results,
    queryCategory: "pain_signals",
    dateCategory: "recent",
    autoRegisterFeeds: input.autoRegisterFeeds ?? true,
    pollingIntervalMinutes: input.pollingIntervalMinutes ?? 60,
    queryRunId: queryRun.id,
  });

  await discoverPollFeedsPhase(registration.feedsToPoll.map((f) => f.id), {
    queryCategory: "pain_signals",
    dateCategory: "recent",
  });
  await mapRssDiscoveryToCandidates({ queryRunId: queryRun.id });

  return {
    painCategory: input.painCategory,
    registeredFeeds: registration.registeredFeeds,
    candidateFeeds: registration.candidateFeeds,
    rejectedCandidates: registration.rejectedCandidates,
    queryRunId: queryRun.id,
  };
}
