import type { EngineConfig } from "../config";
import type { Logger } from "../logger";
import { EngineError } from "../errors";
import type { FeedSource } from "../types";
import type {
  ListFeedSourceFilter,
  Repositories,
} from "../storage/repositories";
import { baseIntervalFor } from "../feeds/polling-policy";
import type { FeedPoller, PollResult } from "../feeds/feed-poller";
import type { RegisterFeedInput } from "../validation/schemas";

// Feed service — register, list, and poll feed sources. Implements POST/GET
// /api/feeds and POST /api/feeds/:id/poll.

export interface RegisterFeedResult {
  id: string;
  active: boolean;
  created: boolean;
}

export interface FeedService {
  registerFeed(
    input: RegisterFeedInput,
    meta?: { discoveredByQuery?: string }
  ): Promise<RegisterFeedResult>;
  listFeeds(filter?: ListFeedSourceFilter): Promise<FeedSource[]>;
  pollFeed(id: string): Promise<PollResult>;
}

export function createFeedService(deps: {
  repos: Repositories;
  poller: FeedPoller;
  config: EngineConfig;
  logger: Logger;
}): FeedService {
  const { repos, poller, config, logger } = deps;

  return {
    async registerFeed(input, meta) {
      const pollingIntervalMinutes =
        input.pollingIntervalMinutes ??
        baseIntervalFor(input.dateCategory) ??
        config.defaultPollIntervalMinutes;

      const { feedSource, created } = await repos.feedSources.upsertByFeedUrl({
        sourceType: input.sourceType,
        originalPlatform: input.originalPlatform,
        feedUrl: input.feedUrl,
        homepageUrl: input.homepageUrl,
        title: input.title,
        queryCategory: input.queryCategory,
        dateCategory: input.dateCategory,
        pollingIntervalMinutes,
        discoveredByQuery: meta?.discoveredByQuery,
      });

      if (created) {
        logger.info("feed registered", {
          id: feedSource.id,
          feedUrl: feedSource.feedUrl,
          sourceType: feedSource.sourceType,
        });
      }

      return { id: feedSource.id, active: feedSource.active, created };
    },

    async listFeeds(filter) {
      return repos.feedSources.list(filter);
    },

    async pollFeed(id) {
      const source = await repos.feedSources.getById(id);
      if (!source) {
        throw new EngineError("NOT_FOUND", `Feed source ${id} not found`, { id });
      }
      return poller.pollFeed(source);
    },
  };
}
