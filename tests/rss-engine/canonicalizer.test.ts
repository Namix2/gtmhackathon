import { describe, expect, it } from "vitest";
import { canonicalizeUrl, hashContent, normalizeFeedItem } from "@/lib/rss-engine/items/canonicalizer";

describe("canonicalizer", () => {
  it("normalizes trailing slashes in canonical URLs", () => {
    expect(canonicalizeUrl("https://example.com/post/")).toBe(
      "https://example.com/post"
    );
  });

  it("creates stable content hashes", () => {
    const a = hashContent(["https://example.com/a", "Title", "Body"]);
    const b = hashContent(["https://example.com/a", "Title", "Body"]);
    expect(a).toBe(b);
  });

  it("builds canonical feed items", () => {
    const item = normalizeFeedItem({
      url: "https://example.substack.com/p/test",
      title: "AI slop in my inbox",
      contentText: "Founders frustrated by generic outreach",
      author: "Alex",
      platform: "substack",
    });
    expect(item.platform).toBe("substack");
    expect(item.canonicalUrl).toContain("substack.com");
    expect(item.contentHash).toHaveLength(64);
  });
});
