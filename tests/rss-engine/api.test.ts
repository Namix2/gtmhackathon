import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  discoverySearchRequestSchema,
  resolveFeedRequestSchema,
  dateWindowQuerySchema,
} from "@/lib/rss-engine/validation/schemas";

describe("validation schemas", () => {
  it("validates discovery search requests", () => {
    const parsed = discoverySearchRequestSchema.parse({
      queryCategory: "pain_signals",
      queries: ["AI slop"],
    });
    expect(parsed.providers).toEqual(["exa", "tavily"]);
    expect(parsed.dateWindowDays).toBe(30);
  });

  it("validates resolve feed requests", () => {
    const parsed = resolveFeedRequestSchema.parse({
      url: "https://example.substack.com/p/post",
      platformHint: "substack",
    });
    expect(parsed.strategy).toContain("rss_app");
  });

  it("validates date window queries", () => {
    const parsed = dateWindowQuerySchema.parse({
      dateCategory: "recent",
      windowDays: 7,
      queries: ["AI slop outbound"],
    });
    expect(parsed.autoRegisterFeeds).toBe(true);
  });
});

describe("API handlers", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("discovery search route returns results", async () => {
    const { POST } = await import("@/app/api/discovery/search/route");
    const res = await POST(
      new Request("http://localhost/api/discovery/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          queryCategory: "pain_signals",
          queries: ["AI slop"],
          providers: ["exa"],
        }),
      })
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(Array.isArray(json.results)).toBe(true);
  });

  it("resolve feed route validates invalid URLs", async () => {
    const { POST } = await import("@/app/api/discovery/resolve-feed/route");
    const res = await POST(
      new Request("http://localhost/api/discovery/resolve-feed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: "not-a-url" }),
      })
    );
    expect(res.status).toBe(400);
  });
});
