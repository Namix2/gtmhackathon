import type { EngineConfig } from "../config";
import type { Logger } from "../logger";
import { dedupeBy } from "../items/deduper";
import { inferPlatform } from "../items/metadata-enricher";
import type { ResolveFeedInput } from "../validation/schemas";
import {
  commonPathFeeds,
  discoverNativeFeeds,
  knownPlatformFeeds,
  type FeedCandidate,
  type HtmlFetcher,
} from "./native-feed-discovery";
import type { FeedFetcher } from "./feed-fetcher";
import { validateFeedXml } from "./feed-validator";
import { rsshubForSubreddit, rsshubForSubstack } from "./rsshub-url-builder";
import { buildRssBridgeUrl } from "./rssbridge-url-builder";
import type { ManagedFeedProvider } from "./rss-app.client";

export type FeedResolutionRejectionReason =
  | "no_feed_found"
  | "requires_authentication"
  | "paywalled"
  | "blocked_by_robots"
  | "unsupported_platform"
  | "invalid_url"
  | "feed_validation_failed";

export interface FeedRejection {
  reason: FeedResolutionRejectionReason;
  detail?: string;
}

export interface FeedResolution {
  resolved: boolean;
  selected?: FeedCandidate;
  candidates: FeedCandidate[];
  rejections: FeedRejection[];
}

export interface ResolverDeps {
  config: EngineConfig;
  htmlFetcher: HtmlFetcher;
  feedFetcher: FeedFetcher;
  managedFeedProvider: ManagedFeedProvider;
  logger: Logger;
}

const SOURCE_TYPE_RANK: Record<string, number> = {
  native_rss: 4,
  rss_app: 3,
  rsshub: 2,
  rssbridge: 1,
  manual: 0,
};

function parseStrategy(strategy: string): string[] {
  return strategy
    .split("_then_")
    .map((s) => s.trim())
    .filter(Boolean);
}

function publicationOf(host: string): string {
  return host.split(".")[0];
}

function subredditOf(pathname: string): string | null {
  const m = pathname.match(/\/r\/([^/]+)/i);
  return m ? m[1] : null;
}

export function createFeedResolver(deps: ResolverDeps) {
  const { config, htmlFetcher, feedFetcher, managedFeedProvider, logger } = deps;

  async function nativeCandidates(
    url: URL,
    platformHint: string | undefined
  ): Promise<FeedCandidate[]> {
    const known = knownPlatformFeeds(url.toString(), platformHint);
    if (known.length > 0) return known;
    if (config.useMocks) return commonPathFeeds(url.toString()).slice(0, 1);
    return discoverNativeFeeds(url.toString(), htmlFetcher, logger);
  }

  function rsshubCandidates(
    url: URL,
    platform: string
  ): { candidates: FeedCandidate[]; rejection?: FeedRejection } {
    if (platform === "substack") {
      return {
        candidates: [
          {
            sourceType: "rsshub",
            feedUrl: rsshubForSubstack(config.rsshubBaseUrl, publicationOf(url.host)),
            confidence: 0.5,
          },
        ],
      };
    }
    if (platform === "reddit") {
      const sub = subredditOf(url.pathname);
      if (sub) {
        return {
          candidates: [
            {
              sourceType: "rsshub",
              feedUrl: rsshubForSubreddit(config.rsshubBaseUrl, sub),
              confidence: 0.5,
            },
          ],
        };
      }
    }
    return {
      candidates: [],
      rejection: {
        reason: "unsupported_platform",
        detail: `no RSSHub route for platform ${platform}`,
      },
    };
  }

  function rssbridgeCandidates(
    url: URL,
    platform: string
  ): { candidates: FeedCandidate[]; rejection?: FeedRejection } {
    // RSS-Bridge has a stable Reddit bridge; other platforms are best handled by
    // native/RSSHub, so we only emit a Reddit bridge candidate here.
    if (platform === "reddit") {
      const sub = subredditOf(url.pathname);
      if (sub) {
        return {
          candidates: [
            {
              sourceType: "rssbridge",
              feedUrl: buildRssBridgeUrl(config.rssbridgeBaseUrl, {
                bridge: "Reddit",
                params: { context: "single", r: sub },
                format: "Atom",
              }),
              confidence: 0.4,
            },
          ],
        };
      }
    }
    return {
      candidates: [],
      rejection: {
        reason: "unsupported_platform",
        detail: `no RSS-Bridge route for platform ${platform}`,
      },
    };
  }

  async function rssAppCandidates(
    url: URL,
    title?: string
  ): Promise<{ candidates: FeedCandidate[]; rejection?: FeedRejection }> {
    if (!managedFeedProvider.isAvailable()) {
      return {
        candidates: [],
        rejection: {
          reason: "unsupported_platform",
          detail: "RSS.app managed feeds not configured",
        },
      };
    }
    try {
      const created = await managedFeedProvider.createFeed({
        url: url.toString(),
        title,
      });
      return {
        candidates: [
          { sourceType: "rss_app", feedUrl: created.feedUrl, confidence: 0.7 },
        ],
      };
    } catch (error) {
      return {
        candidates: [],
        rejection: {
          reason: "no_feed_found",
          detail: error instanceof Error ? error.message : String(error),
        },
      };
    }
  }

  async function resolve(input: ResolveFeedInput): Promise<FeedResolution> {
    let url: URL;
    try {
      url = new URL(input.url);
    } catch {
      return {
        resolved: false,
        candidates: [],
        rejections: [{ reason: "invalid_url", detail: input.url }],
      };
    }

    const platform = inferPlatform(input.url, input.platformHint as never);
    const steps = parseStrategy(input.strategy);
    const candidates: FeedCandidate[] = [];
    const rejections: FeedRejection[] = [];

    for (const step of steps) {
      try {
        if (step === "native") {
          candidates.push(...(await nativeCandidates(url, input.platformHint)));
        } else if (step === "rsshub") {
          const r = rsshubCandidates(url, platform);
          candidates.push(...r.candidates);
          if (r.rejection) rejections.push(r.rejection);
        } else if (step === "rssbridge") {
          const r = rssbridgeCandidates(url, platform);
          candidates.push(...r.candidates);
          if (r.rejection) rejections.push(r.rejection);
        } else if (step === "rss_app") {
          const r = await rssAppCandidates(url);
          candidates.push(...r.candidates);
          if (r.rejection) rejections.push(r.rejection);
        }
      } catch (error) {
        logger.warn("resolver step failed", {
          step,
          url: input.url,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    const unique = dedupeBy(candidates, (c) => c.feedUrl).sort(
      (a, b) =>
        SOURCE_TYPE_RANK[b.sourceType] - SOURCE_TYPE_RANK[a.sourceType] ||
        b.confidence - a.confidence
    );

    // Validate native candidates (deterministic, logged). Skipped in mock mode,
    // where candidates come from trusted platform patterns.
    let selected: FeedCandidate | undefined;
    for (const candidate of unique) {
      if (config.useMocks || candidate.sourceType !== "native_rss") {
        selected = candidate;
        break;
      }
      try {
        const xml = await feedFetcher.fetchFeedXml(candidate.feedUrl);
        const validation = await validateFeedXml(xml);
        if (validation.valid) {
          selected = candidate;
          break;
        }
        rejections.push({
          reason: "feed_validation_failed",
          detail: `${candidate.feedUrl}: ${validation.reason ?? "invalid"}`,
        });
      } catch (error) {
        rejections.push({
          reason: "feed_validation_failed",
          detail: `${candidate.feedUrl}: ${
            error instanceof Error ? error.message : String(error)
          }`,
        });
      }
    }

    if (!selected) {
      if (!rejections.some((r) => r.reason !== "feed_validation_failed")) {
        rejections.push({ reason: "no_feed_found" });
      }
      return { resolved: false, candidates: unique, rejections };
    }

    return { resolved: true, selected, candidates: unique, rejections };
  }

  return { resolve };
}

export type FeedResolver = ReturnType<typeof createFeedResolver>;
