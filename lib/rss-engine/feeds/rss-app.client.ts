import { rssEngineConfig } from "../config";
import { fetchWithRetry } from "../http";

export interface ManagedFeedProvider {
  createFeed(input: {
    url: string;
    title?: string;
  }): Promise<{ feedUrl: string; externalId: string }>;
  getFeed(externalId: string): Promise<{ feedUrl: string; status: string }>;
  deleteFeed(externalId: string): Promise<void>;
}

export class RssAppProvider implements ManagedFeedProvider {
  private apiKey: string;
  private baseUrl: string;

  constructor() {
    const cfg = rssEngineConfig();
    this.apiKey = cfg.rssAppApiKey;
    this.baseUrl = cfg.rssAppBaseUrl;
  }

  async createFeed(input: {
    url: string;
    title?: string;
  }): Promise<{ feedUrl: string; externalId: string }> {
    if (!this.apiKey) {
      throw new Error("RSS_APP_API_KEY is not configured");
    }

    const res = await fetchWithRetry(`${this.baseUrl}/v1/feeds`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ url: input.url, title: input.title }),
    });

    if (!res.ok) {
      throw new Error(`RSS.app create feed failed (${res.status})`);
    }

    const json = (await res.json()) as {
      id?: string;
      feed_url?: string;
      rss_feed_url?: string;
    };

    return {
      externalId: json.id ?? input.url,
      feedUrl: json.feed_url ?? json.rss_feed_url ?? "",
    };
  }

  async getFeed(
    externalId: string
  ): Promise<{ feedUrl: string; status: string }> {
    if (!this.apiKey) {
      throw new Error("RSS_APP_API_KEY is not configured");
    }

    const res = await fetchWithRetry(
      `${this.baseUrl}/v1/feeds/${encodeURIComponent(externalId)}`,
      {
        headers: { Authorization: `Bearer ${this.apiKey}` },
      }
    );

    if (!res.ok) {
      throw new Error(`RSS.app get feed failed (${res.status})`);
    }

    const json = (await res.json()) as {
      feed_url?: string;
      rss_feed_url?: string;
      status?: string;
    };

    return {
      feedUrl: json.feed_url ?? json.rss_feed_url ?? "",
      status: json.status ?? "unknown",
    };
  }

  async deleteFeed(externalId: string): Promise<void> {
    if (!this.apiKey) {
      throw new Error("RSS_APP_API_KEY is not configured");
    }

    const res = await fetchWithRetry(
      `${this.baseUrl}/v1/feeds/${encodeURIComponent(externalId)}`,
      {
        method: "DELETE",
        headers: { Authorization: `Bearer ${this.apiKey}` },
      }
    );

    if (!res.ok) {
      throw new Error(`RSS.app delete feed failed (${res.status})`);
    }
  }
}

export class MockRssAppProvider implements ManagedFeedProvider {
  async createFeed(input: {
    url: string;
  }): Promise<{ feedUrl: string; externalId: string }> {
    const slug = encodeURIComponent(input.url);
    return {
      externalId: `mock-${slug.slice(0, 32)}`,
      feedUrl: `https://mock.rss.app/feeds/${slug.slice(0, 32)}.xml`,
    };
  }

  async getFeed(externalId: string): Promise<{ feedUrl: string; status: string }> {
    return {
      feedUrl: `https://mock.rss.app/feeds/${externalId}.xml`,
      status: "active",
    };
  }

  async deleteFeed(): Promise<void> {
    // no-op
  }
}

export function getManagedFeedProvider(): ManagedFeedProvider {
  const { mockProviders, rssAppApiKey } = rssEngineConfig();
  if (mockProviders || !rssAppApiKey) {
    return new MockRssAppProvider();
  }
  return new RssAppProvider();
}
