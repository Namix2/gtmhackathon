import { describe, expect, it } from "vitest";
import { checkDuplicate } from "@/lib/rss-engine/items/deduper";

describe("deduper", () => {
  it("detects canonical URL duplicates", () => {
    const result = checkDuplicate(
      {
        canonicalUrls: new Set(["https://example.com/a"]),
        contentHashes: new Set(),
      },
      { canonicalUrl: "https://example.com/a", contentHash: "abc" }
    );
    expect(result.isDuplicate).toBe(true);
    expect(result.reason).toBe("canonical_url");
  });

  it("detects content hash duplicates", () => {
    const result = checkDuplicate(
      {
        canonicalUrls: new Set(),
        contentHashes: new Set(["hash-1"]),
      },
      { canonicalUrl: "https://example.com/b", contentHash: "hash-1" }
    );
    expect(result.isDuplicate).toBe(true);
    expect(result.reason).toBe("content_hash");
  });
});
