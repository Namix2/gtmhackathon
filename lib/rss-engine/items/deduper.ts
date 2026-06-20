export type DedupeResult = {
  isDuplicate: boolean;
  reason?: "canonical_url" | "content_hash";
};

export function checkDuplicate(existing: {
  canonicalUrls: Set<string>;
  contentHashes: Set<string>;
}, item: { canonicalUrl: string; contentHash: string }): DedupeResult {
  if (existing.canonicalUrls.has(item.canonicalUrl)) {
    return { isDuplicate: true, reason: "canonical_url" };
  }
  if (existing.contentHashes.has(item.contentHash)) {
    return { isDuplicate: true, reason: "content_hash" };
  }
  return { isDuplicate: false };
}
