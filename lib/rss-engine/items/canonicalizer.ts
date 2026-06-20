import { createHash } from "crypto";
import type { CanonicalFeedItem, OriginalPlatform } from "../types";
import { inferPlatformFromUrl } from "../discovery/types";

export function canonicalizeUrl(raw: string): string {
  try {
    const url = new URL(raw.trim());
    url.hash = "";
    if (url.pathname.endsWith("/") && url.pathname.length > 1) {
      url.pathname = url.pathname.slice(0, -1);
    }
    return url.toString();
  } catch {
    return raw.trim();
  }
}

export function hashContent(parts: string[]): string {
  const normalized = parts.map((p) => p.trim().toLowerCase()).join("\n");
  return createHash("sha256").update(normalized).digest("hex");
}

export function normalizeFeedItem(input: {
  url?: string;
  title?: string;
  summary?: string;
  contentText?: string;
  author?: string;
  publishedAt?: Date;
  platform?: OriginalPlatform;
  tags?: string[];
  externalId?: string;
}): CanonicalFeedItem {
  const url = input.url ?? input.externalId ?? cryptoRandomUrl();
  const canonicalUrl = canonicalizeUrl(url);
  const title = input.title?.trim() || "Untitled";
  const contentText = input.contentText ?? input.summary ?? "";
  const contentHash = hashContent([canonicalUrl, title, contentText]);

  return {
    url,
    canonicalUrl,
    title,
    summary: input.summary,
    contentText,
    author: input.author,
    publishedAt: input.publishedAt,
    platform: input.platform ?? inferPlatformFromUrl(url),
    tags: input.tags ?? [],
    contentHash,
    externalId: input.externalId,
  };
}

function cryptoRandomUrl(): string {
  return `urn:rss-engine:${Math.random().toString(36).slice(2)}`;
}
