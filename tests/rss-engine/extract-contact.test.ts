import { describe, expect, it } from "vitest";
import {
  extractContactInfo,
  mergeContactInfo,
  bestContactProfileUrl,
} from "@/lib/rss-engine/extract-contact";

describe("extractContactInfo", () => {
  it("extracts email from RSS author field", () => {
    const info = extractContactInfo({
      author: "jane@example.com (Jane Doe)",
    });
    expect(info.emails).toContain("jane@example.com");
  });

  it("extracts social links from HTML content", () => {
    const info = extractContactInfo({
      text: `<p>Find me on <a href="https://linkedin.com/in/janedoe">LinkedIn</a> or @janedoe on Twitter.</p>`,
    });
    expect(info.linkedin.some((u) => u.includes("janedoe"))).toBe(true);
    expect(info.twitter).toContain("@janedoe");
  });

  it("merges contact across sources", () => {
    const merged = mergeContactInfo(
      extractContactInfo({ author: "a@b.com" }),
      extractContactInfo({ text: "https://github.com/builder" })
    );
    expect(merged.emails).toContain("a@b.com");
    expect(merged.github.some((u) => u.includes("builder"))).toBe(true);
  });

  it("picks linkedin as best profile url", () => {
    const url = bestContactProfileUrl({
      emails: ["a@b.com"],
      twitter: ["@x"],
      linkedin: ["https://linkedin.com/in/jane"],
      github: [],
      youtube: [],
      substack: [],
      mastodon: [],
      websites: [],
    });
    expect(url).toContain("linkedin.com");
  });
});
