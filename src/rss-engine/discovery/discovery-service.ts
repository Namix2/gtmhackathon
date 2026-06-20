import type { Logger } from "../logger";
import type { SearchProviderName } from "../types";
import { canonicalizeUrl } from "../items/canonicalizer";
import { dedupeBy } from "../items/deduper";
import { inferPlatform } from "../items/metadata-enricher";
import type { DiscoverySearchInput } from "../validation/schemas";
import type { SearchProvider } from "./providers";

// Discovery service — fans a set of queries out across the requested providers,
// normalises the results, and de-duplicates by canonical URL. This is the
// implementation behind POST /api/discovery/search.

export interface DiscoveryResultItem {
  provider: SearchProviderName;
  url: string;
  title?: string;
  summary?: string;
  publishedAt?: string;
  platformHint: string;
  feedCandidates: unknown[];
}

export interface DiscoveryService {
  search(input: DiscoverySearchInput): Promise<{ results: DiscoveryResultItem[] }>;
}

export function createDiscoveryService(deps: {
  providers: SearchProvider[];
  logger: Logger;
}): DiscoveryService {
  const { providers, logger } = deps;

  return {
    async search(input) {
      const active = providers.filter(
        (p) => input.providers.includes(p.name) && p.isAvailable()
      );
      if (active.length === 0) {
        logger.warn("no discovery providers available", {
          requested: input.providers,
        });
      }

      const collected: DiscoveryResultItem[] = [];
      for (const provider of active) {
        for (const query of input.queries) {
          try {
            const results = await provider.search({
              query,
              maxResults: input.maxResultsPerProvider,
              dateWindowDays: input.dateWindowDays,
              platformHints: input.platformHints,
            });
            for (const r of results) {
              collected.push({
                provider: provider.name,
                url: r.url,
                title: r.title,
                summary: r.summary,
                publishedAt: r.publishedAt,
                platformHint: inferPlatform(r.url),
                feedCandidates: [],
              });
            }
          } catch (error) {
            logger.warn("provider search failed", {
              provider: provider.name,
              query,
              error: error instanceof Error ? error.message : String(error),
            });
          }
        }
      }

      const deduped = dedupeBy(collected, (r) => canonicalizeUrl(r.url));
      return { results: deduped };
    },
  };
}
