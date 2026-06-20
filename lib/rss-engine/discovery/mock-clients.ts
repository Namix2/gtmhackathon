import type { DiscoveryResultItem, OriginalPlatform } from "../types";
import type { DiscoveryClient, SearchInput } from "./types";
import { inferPlatformFromUrl } from "./types";

const MOCK_RESULTS: Record<string, Partial<DiscoveryResultItem>[]> = {
  "AI slop": [
    {
      url: "https://newsletter.example.substack.com/p/ai-slop-outbound",
      title: "My inbox is full of AI slop",
      summary: "Founders complaining about generic AI cold outreach.",
      publishedAt: new Date().toISOString(),
      platformHint: "substack",
    },
    {
      url: "https://www.reddit.com/r/SaaS/comments/example/ai_generated_emails/",
      title: "Anyone else drowning in AI-generated sales emails?",
      summary: "Discussion about low quality automated outreach.",
      publishedAt: new Date().toISOString(),
      platformHint: "reddit",
    },
    {
      url: "https://www.youtube.com/@examplechannel",
      title: "Why AI outreach is broken",
      summary: "YouTube creator on inbox noise.",
      publishedAt: new Date().toISOString(),
      platformHint: "youtube",
    },
    {
      url: "https://feeds.example.com/podcast/ai-slop",
      title: "Podcast episode: AI slop in sales",
      summary: "Podcast discussing GTM frustration.",
      publishedAt: new Date().toISOString(),
      platformHint: "podcast",
    },
  ],
  founder: [
    {
      url: "https://foundersales.example.substack.com/p/founder-led-sales-trust",
      title: "Founder-led sales and the trust problem with AI outreach",
      summary: "Persuader discussing messaging and credibility.",
      publishedAt: new Date().toISOString(),
      platformHint: "substack",
    },
  ],
  investor: [
    {
      url: "https://vcnotes.example.com/p/ai-generated-pitches",
      title: "Investors complaining about AI-generated startup pitches",
      summary: "Evaluator screening burden and signal-to-noise.",
      publishedAt: new Date().toISOString(),
      platformHint: "blog",
    },
  ],
};

function mockRowsForQuery(query: string): Partial<DiscoveryResultItem>[] {
  const lower = query.toLowerCase();
  for (const [key, rows] of Object.entries(MOCK_RESULTS)) {
    if (lower.includes(key.toLowerCase())) return rows;
  }
  return [
    {
      url: "https://example.substack.com/p/generic-gtm-post",
      title: `Mock result for: ${query}`,
      summary: "Deterministic mock discovery result for local development.",
      publishedAt: new Date().toISOString(),
      platformHint: "substack" as OriginalPlatform,
    },
  ];
}

export class MockExaClient implements DiscoveryClient {
  provider = "exa" as const;

  async search(input: SearchInput): Promise<DiscoveryResultItem[]> {
    return mockRowsForQuery(input.query).map((row) => ({
      provider: "exa",
      url: row.url!,
      title: row.title,
      summary: row.summary,
      publishedAt: row.publishedAt,
      platformHint: row.platformHint ?? inferPlatformFromUrl(row.url!),
      feedCandidates: [],
    }));
  }
}

export class MockTavilyClient implements DiscoveryClient {
  provider = "tavily" as const;

  async search(input: SearchInput): Promise<DiscoveryResultItem[]> {
    return mockRowsForQuery(input.query).map((row, i) => ({
      provider: "tavily",
      url: row.url!.replace("example", `tavily-${i}`),
      title: row.title,
      summary: row.summary,
      publishedAt: row.publishedAt,
      platformHint: row.platformHint ?? inferPlatformFromUrl(row.url!),
      feedCandidates: [],
    }));
  }
}
