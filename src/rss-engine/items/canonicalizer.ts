import { createHash } from "node:crypto";
import type { FeedSource, ParsedFeedItem } from "../types";
import type { NewFeedItem } from "../storage/repositories";
import { buildSummary, extractText, normalizeWhitespace } from "./content-extractor";
import { extractTags, inferPlatform } from "./metadata-enricher";

// Canonicalisation turns a parsed feed item + its source into the canonical
// FeedItem shape: a stable canonical URL and a content hash (the two dedup keys
// from the overview spec), clean text, platform, and tags.

const TRACKING_PARAM_PREFIXES = ["utm_"];
const TRACKING_PARAMS = new Set([
  "fbclid",
  "gclid",
  "mc_cid",
  "mc_eid",
  "ref",
  "ref_src",
  "source",
  "cmpid",
  "igshid",
]);

export function canonicalizeUrl(rawUrl: string): string {
  try {
    const url = new URL(rawUrl.trim());
    url.hash = "";
    url.host = url.host.toLowerCase();
    url.protocol = url.protocol.toLowerCase();

    const params = url.searchParams;
    const toDelete: string[] = [];
    for (const key of params.keys()) {
      const lower = key.toLowerCase();
      if (TRACKING_PARAMS.has(lower)) toDelete.push(key);
      else if (TRACKING_PARAM_PREFIXES.some((p) => lower.startsWith(p)))
        toDelete.push(key);
    }
    for (const key of toDelete) params.delete(key);
    // Sort remaining params for stable canonical form.
    const sorted = [...params.entries()].sort(([a], [b]) => a.localeCompare(b));
    url.search = "";
    for (const [k, v] of sorted) url.searchParams.append(k, v);

    let result = url.toString();
    // Drop a single trailing slash on the path (but keep root "/").
    result = result.replace(/\/(?=$|\?)/, (m, offset) =>
      url.pathname === "/" ? m : ""
    );
    return result;
  } catch {
    return rawUrl.trim();
  }
}

export function contentHash(title: string, body: string): string {
  const normalized = normalizeWhitespace(`${title}\n${body}`.toLowerCase());
  return createHash("sha256").update(normalized).digest("hex");
}

export function canonicalizeItem(
  raw: ParsedFeedItem,
  source: FeedSource
): NewFeedItem | null {
  const url = raw.link?.trim();
  if (!url) return null;

  const title = normalizeWhitespace(raw.title ?? "") || "(untitled)";
  const contentText = extractText(
    raw.contentEncoded || raw.content || raw.summary || raw.contentSnippet
  );
  const summary = buildSummary(raw.summary ?? raw.contentSnippet, contentText);
  const canonicalUrl = canonicalizeUrl(url);
  const platform = inferPlatform(url, source.originalPlatform);
  const tags = extractTags(`${title} ${contentText}`);
  const publishedAt = normalizeDate(raw.isoDate ?? raw.pubDate);

  return {
    feedSourceId: source.id,
    url,
    canonicalUrl,
    title,
    summary,
    contentText: contentText || undefined,
    author: raw.creator?.trim() || raw.author?.trim() || undefined,
    publishedAt,
    platform,
    tags,
    contentHash: contentHash(title, contentText || summary || title),
    externalId: raw.guid?.trim() || undefined,
  };
}

function normalizeDate(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}
