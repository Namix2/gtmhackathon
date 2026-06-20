import type { Logger } from "../logger";
import type { SourceType } from "../types";

// Native feed discovery (07_source_category_feed_generation.md): known platform
// URL patterns first, then HTML <link rel="alternate"> inspection, then common
// feed paths.

export interface FeedCandidate {
  sourceType: SourceType;
  feedUrl: string;
  confidence: number;
}

export interface HtmlFetcher {
  fetchHtml(url: string): Promise<string>;
}

export const COMMON_FEED_PATHS = [
  "/feed",
  "/rss",
  "/rss.xml",
  "/atom.xml",
  "/index.xml",
];

// Deterministic, no-network candidates from known platform URL shapes.
export function knownPlatformFeeds(
  rawUrl: string,
  platformHint?: string
): FeedCandidate[] {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return [];
  }
  const host = url.host.toLowerCase();

  // Substack: https://{publication}.substack.com/feed
  if (host.endsWith("substack.com") || platformHint === "substack") {
    return [
      {
        sourceType: "native_rss",
        feedUrl: `${url.protocol}//${url.host}/feed`,
        confidence: 0.95,
      },
    ];
  }

  // Reddit: https://www.reddit.com/r/{subreddit}/.rss
  if (host.endsWith("reddit.com") || platformHint === "reddit") {
    const match = url.pathname.match(/\/r\/([^/]+)/i);
    if (match) {
      return [
        {
          sourceType: "native_rss",
          feedUrl: `https://www.reddit.com/r/${match[1]}/.rss`,
          confidence: 0.9,
        },
      ];
    }
  }

  return [];
}

function originOf(rawUrl: string): string | null {
  try {
    return new URL(rawUrl).origin;
  } catch {
    return null;
  }
}

// Parse <link rel="alternate" type="application/rss+xml|atom+xml" href="..."> tags.
export function parseFeedLinks(html: string, baseUrl: string): FeedCandidate[] {
  const candidates: FeedCandidate[] = [];
  const linkRegex = /<link\b[^>]*>/gi;
  const matches = html.match(linkRegex) ?? [];
  for (const tag of matches) {
    if (!/rel=["']?alternate/i.test(tag)) continue;
    const typeMatch = tag.match(/type=["']([^"']+)["']/i);
    const type = typeMatch?.[1]?.toLowerCase() ?? "";
    if (!type.includes("rss") && !type.includes("atom")) continue;
    const hrefMatch = tag.match(/href=["']([^"']+)["']/i);
    if (!hrefMatch) continue;
    let href = hrefMatch[1];
    try {
      href = new URL(href, baseUrl).toString();
    } catch {
      continue;
    }
    candidates.push({ sourceType: "native_rss", feedUrl: href, confidence: 0.9 });
  }
  return candidates;
}

// Common-path guesses (used in mock mode, or when HTML has no feed links).
export function commonPathFeeds(rawUrl: string): FeedCandidate[] {
  const origin = originOf(rawUrl);
  if (!origin) return [];
  return COMMON_FEED_PATHS.map((path) => ({
    sourceType: "native_rss" as SourceType,
    feedUrl: `${origin}${path}`,
    confidence: 0.6,
  }));
}

export async function discoverNativeFeeds(
  rawUrl: string,
  htmlFetcher: HtmlFetcher,
  logger: Logger
): Promise<FeedCandidate[]> {
  try {
    const html = await htmlFetcher.fetchHtml(rawUrl);
    const linkCandidates = parseFeedLinks(html, rawUrl);
    if (linkCandidates.length > 0) return linkCandidates;
  } catch (error) {
    logger.debug("native html discovery failed", {
      url: rawUrl,
      error: error instanceof Error ? error.message : String(error),
    });
  }
  // Fall back to common-path guesses (caller validates before selecting).
  return commonPathFeeds(rawUrl).slice(0, 1);
}
