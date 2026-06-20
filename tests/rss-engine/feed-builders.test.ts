import { describe, expect, it } from "vitest";
import {
  buildRedditSubredditRsshubUrl,
  substackNativeFeedUrl,
} from "@/lib/rss-engine/feeds/rsshub-url-builder";
import { buildRssBridgeUrl } from "@/lib/rss-engine/feeds/rssbridge-url-builder";

describe("feed url builders", () => {
  it("builds substack native feed URLs", () => {
    expect(substackNativeFeedUrl("example")).toBe(
      "https://example.substack.com/feed"
    );
  });

  it("builds rsshub routes", () => {
    expect(buildRedditSubredditRsshubUrl("SaaS")).toContain(
      "/reddit/subreddit/SaaS"
    );
  });

  it("builds rss-bridge URLs", () => {
    const url = buildRssBridgeUrl({
      bridge: "SubstackBridge",
      params: { publication: "example" },
    });
    expect(url).toContain("bridge=SubstackBridge");
    expect(url).toContain("publication=example");
  });
});
