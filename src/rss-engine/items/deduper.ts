import type { NewFeedItem } from "../storage/repositories";

// Batch-level deduplication. Collapses items that share a canonical URL or
// content hash before they reach the repository (which also enforces uniqueness
// on insert). This is the "duplicate posts from the same canonical URL must
// collapse into one" acceptance criterion from the pain-signals spec.

export function dedupeFeedItems(items: NewFeedItem[]): NewFeedItem[] {
  const seenUrls = new Set<string>();
  const seenHashes = new Set<string>();
  const out: NewFeedItem[] = [];
  for (const item of items) {
    if (seenUrls.has(item.canonicalUrl) || seenHashes.has(item.contentHash)) {
      continue;
    }
    seenUrls.add(item.canonicalUrl);
    seenHashes.add(item.contentHash);
    out.push(item);
  }
  return out;
}

// Generic URL-based dedup for discovery results.
export function dedupeBy<T>(items: T[], key: (item: T) => string): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const item of items) {
    const k = key(item);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(item);
  }
  return out;
}
