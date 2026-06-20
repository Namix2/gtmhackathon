import { fetchWithRetry } from "../http";
import { rssLogger } from "../logger";
import type {
  FeedCandidate,
  FeedRejection,
  FeedResolutionStrategy,
  OriginalPlatform,
  SourceType,
} from "../types";
import { getManagedFeedProvider } from "../feeds/rss-app.client";
import {
  buildRedditBridgeUrl,
  buildSubstackBridgeUrl,
} from "../feeds/rssbridge-url-builder";
import { validateFeedUrl } from "../feeds/feed-parser";
import {
  buildRedditSearchRsshubUrl,
  buildRedditSubredditRsshubUrl,
  buildSubstackRsshubUrl,
  buildYoutubeChannelRsshubUrl,
  buildYoutubePlaylistRsshubUrl,
  buildYoutubeUserRsshubUrl,
  redditSearchFeedUrl,
  redditSubredditFeedUrl,
  substackNativeFeedUrl,
  youtubeChannelFeedUrl,
} from "../feeds/rsshub-url-builder";
import { inferPlatformFromUrl } from "./types";

const COMMON_FEED_PATHS = ["/feed", "/rss", "/rss.xml", "/atom.xml", "/index.xml"];

function parseSubstackPublication(url: URL): string | null {
  const match = url.hostname.match(/^([^.]+)\.substack\.com$/i);
  return match?.[1] ?? null;
}

function parseRedditSubreddit(url: URL): string | null {
  const match = url.pathname.match(/^\/r\/([^/]+)/i);
  return match?.[1] ?? null;
}

async function discoverNativeFeedLinks(pageUrl: string): Promise<string[]> {
  const res = await fetchWithRetry(pageUrl, { method: "GET" });
  if (res.status === 401 || res.status === 403) {
    throw new Error("requires_authentication");
  }
  if (!res.ok) return [];

  const html = await res.text();
  const links: string[] = [];
  const linkRegex =
    /<link[^>]+rel=["']alternate["'][^>]+type=["']application\/(rss|atom)\+xml["'][^>]*>/gi;
  let match: RegExpExecArray | null;
  while ((match = linkRegex.exec(html)) !== null) {
    const hrefMatch = match[0].match(/href=["']([^"']+)["']/i);
    if (hrefMatch?.[1]) {
      try {
        links.push(new URL(hrefMatch[1], pageUrl).toString());
      } catch {
        // skip invalid href
      }
    }
  }
  return links;
}

async function tryCommonFeedPaths(origin: string): Promise<string[]> {
  const found: string[] = [];
  for (const path of COMMON_FEED_PATHS) {
    const candidate = `${origin.replace(/\/$/, "")}${path}`;
    if (await validateFeedUrl(candidate)) found.push(candidate);
  }
  return found;
}

async function validateCandidates(
  candidates: FeedCandidate[]
): Promise<{ valid: FeedCandidate[]; rejections: FeedRejection[] }> {
  const valid: FeedCandidate[] = [];
  const rejections: FeedRejection[] = [];

  for (const candidate of candidates) {
    const ok = await validateFeedUrl(candidate.feedUrl);
    if (ok) valid.push(candidate);
    else {
      rejections.push({
        sourceType: candidate.sourceType,
        reason: "feed_validation_failed",
        detail: candidate.feedUrl,
      });
    }
  }

  return { valid, rejections };
}

function parseYoutubeChannelId(url: URL): string | null {
  const channelMatch = url.pathname.match(/\/channel\/([^/]+)/i);
  if (channelMatch?.[1]) return channelMatch[1];
  const id = url.searchParams.get("channel_id");
  return id ?? null;
}

function parseYoutubeHandle(url: URL): string | null {
  const handleMatch = url.pathname.match(/^\/@([^/]+)/i);
  return handleMatch?.[1] ?? null;
}

function parseYoutubePlaylistId(url: URL): string | null {
  const match = url.pathname.match(/\/playlist/i);
  if (!match) return null;
  return url.searchParams.get("list");
}

function platformPatternCandidates(
  url: URL,
  platformHint?: OriginalPlatform
): FeedCandidate[] {
  const candidates: FeedCandidate[] = [];
  const platform =
    platformHint && platformHint !== "unknown"
      ? platformHint
      : inferPlatformFromUrl(url.toString());

  if (platform === "substack") {
    const publication = parseSubstackPublication(url);
    if (publication) {
      candidates.push({
        sourceType: "native_rss",
        feedUrl: substackNativeFeedUrl(publication),
        confidence: 0.95,
      });
      candidates.push({
        sourceType: "rsshub",
        feedUrl: buildSubstackRsshubUrl(publication),
        confidence: 0.75,
      });
      candidates.push({
        sourceType: "rssbridge",
        feedUrl: buildSubstackBridgeUrl(publication),
        confidence: 0.65,
      });
    }
  }

  if (platform === "reddit") {
    const subreddit = parseRedditSubreddit(url);
    if (subreddit) {
      candidates.push({
        sourceType: "native_rss",
        feedUrl: redditSubredditFeedUrl(subreddit),
        confidence: 0.9,
      });
      candidates.push({
        sourceType: "rsshub",
        feedUrl: buildRedditSubredditRsshubUrl(subreddit),
        confidence: 0.7,
      });
      candidates.push({
        sourceType: "rssbridge",
        feedUrl: buildRedditBridgeUrl(subreddit),
        confidence: 0.6,
      });
    } else if (url.searchParams.get("q")) {
      const q = url.searchParams.get("q")!;
      candidates.push({
        sourceType: "native_rss",
        feedUrl: redditSearchFeedUrl(q),
        confidence: 0.85,
      });
      candidates.push({
        sourceType: "rsshub",
        feedUrl: buildRedditSearchRsshubUrl(q),
        confidence: 0.65,
      });
    }
  }

  if (platform === "youtube") {
    const channelId = parseYoutubeChannelId(url);
    if (channelId) {
      candidates.push({
        sourceType: "native_rss",
        feedUrl: youtubeChannelFeedUrl(channelId),
        confidence: 0.92,
      });
      candidates.push({
        sourceType: "rsshub",
        feedUrl: buildYoutubeChannelRsshubUrl(channelId),
        confidence: 0.85,
      });
    }
    const handle = parseYoutubeHandle(url);
    if (handle) {
      candidates.push({
        sourceType: "rsshub",
        feedUrl: buildYoutubeUserRsshubUrl(handle),
        confidence: 0.88,
      });
    }
    const playlistId = parseYoutubePlaylistId(url);
    if (playlistId) {
      candidates.push({
        sourceType: "rsshub",
        feedUrl: buildYoutubePlaylistRsshubUrl(playlistId),
        confidence: 0.8,
      });
    }
  }

  if (platform === "podcast") {
    const origin = url.origin;
    candidates.push({
      sourceType: "native_rss",
      feedUrl: `${origin}/feed`,
      confidence: 0.75,
    });
    candidates.push({
      sourceType: "native_rss",
      feedUrl: `${origin}/rss`,
      confidence: 0.7,
    });
    if (url.hostname.includes("buzzsprout.com")) {
      const idMatch = url.pathname.match(/\/(\d+)/);
      if (idMatch?.[1]) {
        candidates.push({
          sourceType: "native_rss",
          feedUrl: `https://feeds.buzzsprout.com/${idMatch[1]}.rss`,
          confidence: 0.9,
        });
      }
    }
  }

  return candidates;
}

function dedupeCandidates(candidates: FeedCandidate[]): FeedCandidate[] {
  const byUrl = new Map<string, FeedCandidate>();
  for (const c of candidates) {
    const existing = byUrl.get(c.feedUrl);
    if (!existing || c.confidence > existing.confidence) {
      byUrl.set(c.feedUrl, c);
    }
  }
  return Array.from(byUrl.values()).sort((a, b) => b.confidence - a.confidence);
}

export async function resolveFeedUrl(input: {
  url: string;
  platformHint?: OriginalPlatform;
  strategy?: FeedResolutionStrategy;
  fast?: boolean;
}): Promise<{
  resolved: boolean;
  selected?: FeedCandidate;
  candidates: FeedCandidate[];
  rejections: FeedRejection[];
}> {
  let parsed: URL;
  try {
    parsed = new URL(input.url);
  } catch {
    return {
      resolved: false,
      candidates: [],
      rejections: [{ reason: "invalid_url", detail: input.url }],
    };
  }

  const fast = input.fast ?? false;
  const strategy =
    input.strategy ?? "native_then_rsshub_then_rssbridge_then_rss_app";
  const rejections: FeedRejection[] = [];
  const candidates: FeedCandidate[] = [];

  if (!fast) {
    try {
      const linkFeeds = await discoverNativeFeedLinks(parsed.toString());
      for (const feedUrl of linkFeeds) {
        candidates.push({
          sourceType: "native_rss",
          feedUrl,
          confidence: 0.98,
        });
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      if (msg.includes("requires_authentication")) {
        rejections.push({
          reason: "requires_authentication",
          detail: input.url,
        });
      }
    }

    const common = await tryCommonFeedPaths(parsed.origin);
    for (const feedUrl of common) {
      candidates.push({ sourceType: "native_rss", feedUrl, confidence: 0.92 });
    }
  }

  candidates.push(...platformPatternCandidates(parsed, input.platformHint));

  let deduped = dedupeCandidates(candidates);

  let valid: FeedCandidate[];
  if (fast) {
    valid = deduped.filter((c) => c.confidence >= 0.7);
    if (valid.length === 0 && deduped.length > 0) valid = [deduped[0]!];
  } else {
    const validated = await validateCandidates(deduped);
    valid = validated.valid;
    rejections.push(...validated.rejections);
  }

  if (
    !fast &&
    valid.length === 0 &&
    strategy === "native_then_rsshub_then_rssbridge_then_rss_app"
  ) {
    try {
      const provider = getManagedFeedProvider();
      const created = await provider.createFeed({ url: input.url });
      if (created.feedUrl) {
        const rssAppCandidate: FeedCandidate = {
          sourceType: "rss_app",
          feedUrl: created.feedUrl,
          confidence: 0.5,
        };
        if (await validateFeedUrl(created.feedUrl)) {
          valid = [rssAppCandidate];
        } else {
          rejections.push({
            sourceType: "rss_app",
            reason: "feed_validation_failed",
            detail: created.feedUrl,
          });
        }
      }
    } catch (error) {
      rejections.push({
        sourceType: "rss_app",
        reason: "no_feed_found",
        detail: error instanceof Error ? error.message : String(error),
      });
    }
  }

  deduped = dedupeCandidates(valid.length ? valid : deduped);

  rssLogger.info("feed resolution complete", {
    url: input.url,
    candidateCount: deduped.length,
    validCount: valid.length,
  });

  if (valid.length === 0 && deduped.length === 0) {
    rejections.push({ reason: "no_feed_found", detail: input.url });
    return { resolved: false, candidates: [], rejections };
  }

  const selected = valid[0] ?? deduped[0];
  return {
    resolved: Boolean(selected),
    selected,
    candidates: deduped,
    rejections,
  };
}

export function sourceTypeOrder(sourceType: SourceType): number {
  switch (sourceType) {
    case "native_rss":
      return 0;
    case "rsshub":
      return 1;
    case "rssbridge":
      return 2;
    case "rss_app":
      return 3;
    default:
      return 4;
  }
}
