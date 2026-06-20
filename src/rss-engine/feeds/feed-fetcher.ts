import type { EngineConfig } from "../config";
import type { Logger } from "../logger";
import { fetchText } from "../http/fetch";
import type { HtmlFetcher } from "./native-feed-discovery";

// Feed/HTML fetching is isolated behind small interfaces so the resolver and
// poller never call the network directly. This makes them deterministic in tests
// (fixture fetcher) and key-free locally (mock fetcher).

export interface FeedFetcher {
  fetchFeedXml(feedUrl: string): Promise<string>;
}

export function createHttpFeedFetcher(
  config: EngineConfig,
  logger: Logger
): FeedFetcher {
  return {
    fetchFeedXml: (feedUrl) =>
      fetchText(feedUrl, {
        timeoutMs: config.httpTimeoutMs,
        maxRetries: config.httpMaxRetries,
        userAgent: config.userAgent,
        headers: { Accept: "application/rss+xml, application/atom+xml, application/xml, text/xml, */*" },
        logger,
      }),
  };
}

export function createHttpHtmlFetcher(
  config: EngineConfig,
  logger: Logger
): HtmlFetcher {
  return {
    fetchHtml: (url) =>
      fetchText(url, {
        timeoutMs: config.httpTimeoutMs,
        maxRetries: config.httpMaxRetries,
        userAgent: config.userAgent,
        headers: { Accept: "text/html,application/xhtml+xml" },
        logger,
      }),
  };
}

// Fixture fetcher for tests: maps exact feed URLs to XML. Optionally falls back
// to the mock generator for unmapped URLs.
export function createFixtureFeedFetcher(
  fixtures: Record<string, string>,
  options: { fallbackToMock?: boolean } = {}
): FeedFetcher {
  const mock = createMockFeedFetcher();
  return {
    async fetchFeedXml(feedUrl) {
      if (feedUrl in fixtures) return fixtures[feedUrl];
      if (options.fallbackToMock) return mock.fetchFeedXml(feedUrl);
      throw new Error(`No fixture for feed URL: ${feedUrl}`);
    },
  };
}

export function createMockHtmlFetcher(): HtmlFetcher {
  return {
    async fetchHtml() {
      // No real HTML in mock mode; resolver relies on platform patterns and
      // common-path guesses instead.
      return "";
    },
  };
}

// --- Deterministic synthetic feed generator --------------------------------

const AUTHORS = [
  "Jordan Mills",
  "Priya Nair",
  "Sam Okafor",
  "Lena Petrova",
  "Diego Alvarez",
];

const ROLE_BY_PLATFORM: Record<string, string> = {
  substack: "founder-led sales founder",
  reddit: "sales leader outbound sdr",
  hackernews: "startup founder",
  news: "investor venture capital deal flow",
  blog: "recruiter screening candidates",
};

const ITEM_TEMPLATES = [
  "Why AI slop is killing cold outreach and every pitch sounds the same",
  "My inbox is full of AI generated pitches and the signal to noise is terrible",
  "Generic outreach and AI-generated cold outreach are wasting everyone's time",
  "Founders are frustrated: low-quality outreach and cold email fatigue",
  "Investors complain about AI-generated pitches flooding their inbox",
];

function hashNum(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

function platformFromHost(host: string): string {
  if (host.endsWith("substack.com")) return "substack";
  if (host.endsWith("reddit.com")) return "reddit";
  if (host.includes("ycombinator")) return "hackernews";
  if (host.startsWith("news.")) return "news";
  return "blog";
}

export function generateMockFeedXml(feedUrl: string, itemCount = 5): string {
  let origin = "https://example.com";
  let host = "example.com";
  try {
    const u = new URL(feedUrl);
    origin = u.origin;
    host = u.host.toLowerCase();
  } catch {
    /* keep defaults */
  }
  const platform = platformFromHost(host);
  const roleText = ROLE_BY_PLATFORM[platform] ?? "";
  const seed = hashNum(feedUrl);

  const items = Array.from({ length: itemCount }, (_, i) => {
    const title = ITEM_TEMPLATES[(seed + i) % ITEM_TEMPLATES.length];
    const author = AUTHORS[(seed + i) % AUTHORS.length];
    const pub = new Date(Date.now() - (i + 1) * 18 * 3_600_000).toUTCString();
    const link = `${origin}/p/${host.split(".")[0]}-${seed % 9973}-${i}`;
    const body =
      `${title}. As a ${roleText}, I keep seeing AI slop and generic outreach. ` +
      `The cold email fatigue is real and it's hard to tell what is real anymore. ` +
      `We are frustrated and tired of automated spam in the inbox.`;
    return `    <item>
      <title>${escapeXml(title)}</title>
      <link>${escapeXml(link)}</link>
      <guid isPermaLink="true">${escapeXml(link)}</guid>
      <dc:creator>${escapeXml(author)}</dc:creator>
      <pubDate>${pub}</pubDate>
      <description>${escapeXml(body)}</description>
      <content:encoded><![CDATA[<p>${body}</p>]]></content:encoded>
      <category>AI slop</category>
    </item>`;
  }).join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:content="http://purl.org/rss/1.0/modules/content/">
  <channel>
    <title>${escapeXml(host)} — GTM signals</title>
    <link>${escapeXml(origin)}</link>
    <description>Synthetic feed for local/dev mode</description>
${items}
  </channel>
</rss>`;
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function createMockFeedFetcher(): FeedFetcher {
  return {
    async fetchFeedXml(feedUrl) {
      return generateMockFeedXml(feedUrl);
    },
  };
}
