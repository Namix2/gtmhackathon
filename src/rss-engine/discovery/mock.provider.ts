import type { SearchProviderName } from "../types";
import type {
  ProviderSearchInput,
  ProviderSearchResult,
  SearchProvider,
} from "./providers";

// Deterministic mock search provider. Lets the entire engine run end-to-end with
// no API keys: it synthesises plausible, GTM-relevant candidate URLs from the
// query + platform hints. URLs are shaped so the feed resolver can map them to
// feed URLs (Substack/Reddit native patterns, /feed for blogs), and the mock
// feed fetcher then generates AI-slop content for those feeds.

const DEFAULT_HINTS = ["substack", "reddit", "blog"];

function hashNum(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

function slugify(value: string): string {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "topic"
  );
}

function urlForPlatform(platform: string, slug: string, seed: number): string {
  switch (platform) {
    case "substack":
      return `https://${slug}.substack.com/p/${slug}-ai-slop-${seed % 97}`;
    case "reddit":
      return `https://www.reddit.com/r/sales/comments/${(seed % 100000).toString(
        36
      )}/${slug}`;
    case "hackernews":
      return `https://news.ycombinator.com/item?id=${30000000 + (seed % 999999)}`;
    case "news":
      return `https://news.${slug}.example.com/${slug}-${seed % 97}`;
    case "blog":
    default:
      return `https://${slug}.example-blog.com/posts/${slug}-${seed % 97}`;
  }
}

export function createMockProvider(name: SearchProviderName): SearchProvider {
  return {
    name,
    isAvailable: () => true,

    async search(input: ProviderSearchInput): Promise<ProviderSearchResult[]> {
      const hints = input.platformHints.length ? input.platformHints : DEFAULT_HINTS;
      const slug = slugify(input.query);
      const results: ProviderSearchResult[] = [];
      const windowDays = input.dateWindowDays ?? 7;

      hints.forEach((platform, hintIndex) => {
        const seed = hashNum(`${name}:${input.query}:${platform}`);
        // Spread publish dates inside the window so recency varies.
        const ageHours = (hintIndex + 1) * Math.max(1, (windowDays * 24) / (hints.length + 1));
        const publishedAt = new Date(Date.now() - ageHours * 3_600_000).toISOString();
        results.push({
          url: urlForPlatform(platform, `${slug}-${name}`, seed),
          title: `${input.query} — why ${platform} is full of AI slop`,
          summary: `A ${platform} discussion about generic AI cold outreach, AI-generated pitches, and inbox noise around "${input.query}".`,
          publishedAt,
          rawContent: `Founders and investors keep complaining that AI slop and generic outreach make every pitch sound the same.`,
        });
      });

      return results.slice(0, input.maxResults);
    },
  };
}
