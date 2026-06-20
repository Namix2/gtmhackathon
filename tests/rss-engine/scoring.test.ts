import { describe, expect, it } from "vitest";
import { classifyAiSlopFrustration } from "@/lib/rss-engine/scoring/ai-slop-frustration";
import { scoreFeedItem } from "@/lib/rss-engine/scoring/priority-matrix";
import { classifyIcp } from "@/lib/rss-engine/scoring/icp-classifier";
import { freshnessMultiplier } from "@/lib/rss-engine/scoring/freshness";

describe("scoring", () => {
  it("detects AI slop frustration phrases", () => {
    const result = classifyAiSlopFrustration(
      "My inbox is full of AI slop and generic outreach"
    );
    expect(result.score).toBeGreaterThan(0);
    expect(result.sentiment).toBe("negative");
    expect(result.matchedPhrases.length).toBeGreaterThan(0);
  });

  it("classifies persuader content", () => {
    const icp = classifyIcp(
      "Startup founder struggling with founder-led sales outbound",
      "icp_persuaders"
    );
    expect(icp.category).toBe("persuader");
  });

  it("classifies evaluator content", () => {
    const icp = classifyIcp(
      "VC investor complaining about AI-generated startup pitches in my inbox",
      "icp_evaluators"
    );
    expect(icp.category).toBe("evaluator");
  });

  it("scores feed items with rationale", () => {
    const score = scoreFeedItem({
      title: "Investors complaining about AI-generated pitches",
      contentText: "Signal to noise is terrible. AI slop everywhere.",
      platform: "substack",
      publishedAt: new Date(),
      queryCategory: "pain_signals",
    });
    expect(score.priorityScore).toBeGreaterThan(0);
    expect(score.rationale.length).toBeGreaterThan(0);
  });

  it("applies freshness multiplier", () => {
    expect(freshnessMultiplier(12)).toBe(1.25);
    expect(freshnessMultiplier(200)).toBe(1.0);
  });
});
