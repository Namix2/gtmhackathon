import type { EngineConfig } from "../config";
import type { Logger } from "../logger";
import { fetchJson } from "../http/fetch";
import {
  buildExaQuery,
  startPublishedDate,
} from "./search-query-builder";
import type {
  ProviderSearchInput,
  ProviderSearchResult,
  SearchProvider,
} from "./providers";

// Exa semantic discovery client. Endpoint per the overview spec:
//   POST https://api.exa.ai/search  (x-api-key)

interface ExaResponse {
  results?: Array<{
    url: string;
    title?: string;
    publishedDate?: string;
    summary?: string;
    text?: string;
  }>;
}

export function createExaProvider(
  config: EngineConfig,
  logger: Logger,
  now: () => Date = () => new Date()
): SearchProvider {
  return {
    name: "exa",
    isAvailable: () => Boolean(config.exaApiKey),

    async search(input: ProviderSearchInput): Promise<ProviderSearchResult[]> {
      if (!config.exaApiKey) return [];
      const body: Record<string, unknown> = {
        query: buildExaQuery(input.query, input.platformHints),
        numResults: input.maxResults,
        contents: { text: true, highlights: true, summary: true },
      };
      const start = startPublishedDate(now(), input.dateWindowDays);
      if (start) body.startPublishedDate = start;

      logger.debug("exa search", { query: input.query });
      const json = await fetchJson<ExaResponse>(`${config.exaBaseUrl}/search`, {
        method: "POST",
        headers: {
          "x-api-key": config.exaApiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
        timeoutMs: config.httpTimeoutMs,
        maxRetries: config.httpMaxRetries,
        userAgent: config.userAgent,
        logger,
      });

      return (json.results ?? []).map((r) => ({
        url: r.url,
        title: r.title,
        summary: r.summary,
        publishedAt: r.publishedDate,
        rawContent: r.text,
      }));
    },
  };
}
