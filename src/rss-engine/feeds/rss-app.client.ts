import type { EngineConfig } from "../config";
import type { Logger } from "../logger";
import { fetchJson } from "../http/fetch";

// Managed feed provider (RSS.app) behind a common interface, used as the final
// fallback when native RSS / RSSHub / RSS-Bridge all fail
// (07_source_category_feed_generation.md).

export interface ManagedFeedProvider {
  isAvailable(): boolean;
  createFeed(input: {
    url: string;
    title?: string;
  }): Promise<{ feedUrl: string; externalId: string }>;
  getFeed(externalId: string): Promise<{ feedUrl: string; status: string }>;
  deleteFeed(externalId: string): Promise<void>;
}

interface RssAppFeedResponse {
  id: string;
  rss_feed_url: string;
  status?: string;
}

export function createRssAppProvider(
  config: EngineConfig,
  logger: Logger
): ManagedFeedProvider {
  const headers = () => ({
    Authorization: `Bearer ${config.rssAppApiKey}`,
    "Content-Type": "application/json",
  });

  return {
    isAvailable: () => Boolean(config.rssAppApiKey),

    async createFeed(input) {
      const json = await fetchJson<RssAppFeedResponse>(
        `${config.rssAppBaseUrl}/v1/feeds`,
        {
          method: "POST",
          headers: headers(),
          body: JSON.stringify({ url: input.url, title: input.title }),
          timeoutMs: config.httpTimeoutMs,
          maxRetries: config.httpMaxRetries,
          userAgent: config.userAgent,
          logger,
        }
      );
      return { feedUrl: json.rss_feed_url, externalId: json.id };
    },

    async getFeed(externalId) {
      const json = await fetchJson<RssAppFeedResponse>(
        `${config.rssAppBaseUrl}/v1/feeds/${externalId}`,
        {
          headers: headers(),
          timeoutMs: config.httpTimeoutMs,
          maxRetries: config.httpMaxRetries,
          userAgent: config.userAgent,
          logger,
        }
      );
      return { feedUrl: json.rss_feed_url, status: json.status ?? "unknown" };
    },

    async deleteFeed(externalId) {
      await fetchJson(`${config.rssAppBaseUrl}/v1/feeds/${externalId}`, {
        method: "DELETE",
        headers: headers(),
        timeoutMs: config.httpTimeoutMs,
        maxRetries: config.httpMaxRetries,
        userAgent: config.userAgent,
        logger,
      });
    },
  };
}

// Used in real mode when no RSS.app key is configured: managed feeds are simply
// not available, so the resolver records a rejection instead of fabricating one.
export function createUnavailableManagedFeedProvider(): ManagedFeedProvider {
  const unavailable = () => {
    throw new Error("RSS.app managed feeds are not configured");
  };
  return {
    isAvailable: () => false,
    createFeed: async () => unavailable(),
    getFeed: async () => unavailable(),
    deleteFeed: async () => unavailable(),
  };
}

// Deterministic mock managed-feed provider for local/test runs.
export function createMockManagedFeedProvider(): ManagedFeedProvider {
  const feeds = new Map<string, string>();
  return {
    isAvailable: () => true,
    async createFeed(input) {
      const externalId = `mock_${Buffer.from(input.url).toString("base64url").slice(0, 12)}`;
      const feedUrl = `https://rss.app/feeds/${externalId}.xml`;
      feeds.set(externalId, feedUrl);
      return { feedUrl, externalId };
    },
    async getFeed(externalId) {
      return {
        feedUrl: feeds.get(externalId) ?? `https://rss.app/feeds/${externalId}.xml`,
        status: "active",
      };
    },
    async deleteFeed(externalId) {
      feeds.delete(externalId);
    },
  };
}
