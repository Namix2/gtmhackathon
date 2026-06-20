import { describe, expect, it } from "vitest";
import { runDiscoverySearch } from "@/lib/rss-engine/services/query-runner";

describe("discovery search (mock providers)", () => {
  it("returns deterministic mock results without API keys", async () => {
    const { results } = await runDiscoverySearch({
      queryCategory: "pain_signals",
      queries: ["AI slop cold outreach"],
      providers: ["exa"],
      platformHints: ["substack"],
      dateWindowDays: 7,
      maxResultsPerProvider: 5,
    });

    expect(results.length).toBeGreaterThan(0);
    expect(results[0]?.provider).toBe("exa");
    expect(results[0]?.url).toContain("http");
  });
});
