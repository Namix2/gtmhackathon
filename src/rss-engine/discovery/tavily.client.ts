import type { EngineConfig } from "../config";
import type { Logger } from "../logger";
import { fetchJson } from "../http/fetch";
import { buildTavilyQuery } from "./search-query-builder";
import type {
  ProviderSearchInput,
  ProviderSearchResult,
  SearchProvider,
} from "./providers";

// Tavily web search + extraction client. Endpoint per the overview spec:
//   POST https://api.tavily.com/search  (Authorization: Bearer)

interface TavilyResponse {
  results?: Array<{
    url: string;
    title?: string;
    content?: string;
    raw_content?: string;
    published_date?: string;
  }>;
}

export function createTavilyProvider(
  config: EngineConfig,
  logger: Logger
): SearchProvider {
  return {
    name: "tavily",
    isAvailable: () => Boolean(config.tavilyApiKey),

    async search(input: ProviderSearchInput): Promise<ProviderSearchResult[]> {
      if (!config.tavilyApiKey) return [];
      const body: Record<string, unknown> = {
        query: buildTavilyQuery(input.query, input.platformHints),
        topic: "general",
        search_depth: "advanced",
        max_results: input.maxResults,
        include_answer: false,
        include_raw_content: true,
      };
      if (input.dateWindowDays) body.days = input.dateWindowDays;

      logger.debug("tavily search", { query: input.query });
      const json = await fetchJson<TavilyResponse>(
        `${config.tavilyBaseUrl}/search`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${config.tavilyApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
          timeoutMs: config.httpTimeoutMs,
          maxRetries: config.httpMaxRetries,
          userAgent: config.userAgent,
          logger,
        }
      );

      return (json.results ?? []).map((r) => ({
        url: r.url,
        title: r.title,
        summary: r.content,
        publishedAt: r.published_date,
        rawContent: r.raw_content,
      }));
    },
  };
}
