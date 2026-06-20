import { rssEngineConfig } from "../config";
import { fetchWithRetry } from "../http";
import type { DiscoveryResultItem } from "../types";
import type { DiscoveryClient, SearchInput } from "./types";
import { inferPlatformFromUrl } from "./types";

type ExaResult = {
  url?: string;
  title?: string;
  text?: string;
  summary?: string;
  publishedDate?: string;
};

export class ExaClient implements DiscoveryClient {
  provider = "exa" as const;

  async search(input: SearchInput): Promise<DiscoveryResultItem[]> {
    const { exaApiKey } = rssEngineConfig();
    if (!exaApiKey) {
      throw new Error("EXA_API_KEY is not configured");
    }

    const startPublishedDate =
      input.dateWindowDays && input.dateWindowDays > 0
        ? new Date(
            Date.now() - input.dateWindowDays * 24 * 60 * 60 * 1000
          ).toISOString()
        : undefined;

    const res = await fetchWithRetry("https://api.exa.ai/search", {
      method: "POST",
      headers: {
        "x-api-key": exaApiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: input.query,
        numResults: input.maxResults ?? 20,
        ...(startPublishedDate ? { startPublishedDate } : {}),
        contents: { text: true, highlights: true, summary: true },
      }),
    });

    if (!res.ok) {
      throw new Error(`Exa search failed (${res.status})`);
    }

    const json = (await res.json()) as { results?: ExaResult[] };
    return (json.results ?? [])
      .filter((r): r is ExaResult & { url: string } => Boolean(r.url))
      .map((r) => ({
        provider: "exa" as const,
        url: r.url,
        title: r.title,
        summary: r.summary ?? r.text?.slice(0, 280),
        publishedAt: r.publishedDate,
        platformHint: inferPlatformFromUrl(r.url),
        feedCandidates: [],
      }));
  }
}

export class TavilyClient implements DiscoveryClient {
  provider = "tavily" as const;

  async search(input: SearchInput): Promise<DiscoveryResultItem[]> {
    const { tavilyApiKey } = rssEngineConfig();
    if (!tavilyApiKey) {
      throw new Error("TAVILY_API_KEY is not configured");
    }

    const res = await fetchWithRetry("https://api.tavily.com/search", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${tavilyApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: input.query,
        topic: "general",
        search_depth: "advanced",
        max_results: input.maxResults ?? 20,
        ...(input.dateWindowDays ? { days: input.dateWindowDays } : {}),
        include_answer: false,
        include_raw_content: true,
      }),
    });

    if (!res.ok) {
      throw new Error(`Tavily search failed (${res.status})`);
    }

    const json = (await res.json()) as {
      results?: {
        url?: string;
        title?: string;
        content?: string;
        published_date?: string;
      }[];
    };

    return (json.results ?? [])
      .filter((r): r is { url: string; title?: string; content?: string; published_date?: string } =>
        Boolean(r.url)
      )
      .map((r) => ({
        provider: "tavily" as const,
        url: r.url,
        title: r.title,
        summary: r.content?.slice(0, 280),
        publishedAt: r.published_date,
        platformHint: inferPlatformFromUrl(r.url),
        feedCandidates: [],
      }));
  }
}
